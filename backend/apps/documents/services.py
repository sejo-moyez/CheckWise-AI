import io
import zipfile
from pathlib import Path
from django.conf import settings
from rest_framework.exceptions import ValidationError
from docx import Document as DocxDocument
from pypdf import PdfReader


def validate_text(text):
    text = text.replace('\x00', '').strip()
    if not text:
        raise ValidationError('Document contains no readable text. Scanned PDFs require OCR before upload.')
    if len(text) > 1_000_000 or len(text.split()) > settings.MAX_DOCUMENT_WORDS:
        raise ValidationError(f'Document exceeds the {settings.MAX_DOCUMENT_WORDS:,} word limit.')
    return text


def extract(upload):
    if upload.size > settings.MAX_UPLOAD_BYTES:
        raise ValidationError('Maximum upload size is 20 MB.')
    ext = Path(upload.name).suffix.lower()
    if ext not in ['.txt', '.pdf', '.docx']:
        raise ValidationError('Only PDF, DOCX and UTF-8 TXT files are supported.')
    raw = upload.read()
    upload.seek(0)
    try:
        if ext == '.txt':
            text = raw.decode('utf-8-sig')
        elif ext == '.pdf':
            if not raw.startswith(b'%PDF-'):
                raise ValueError('Not a PDF')
            reader = PdfReader(io.BytesIO(raw), strict=True)
            if reader.is_encrypted:
                raise ValidationError('Password-protected PDFs are not supported.')
            if len(reader.pages) > 500:
                raise ValidationError('Maximum PDF page count is 500.')
            parts = []
            total = 0
            for page in reader.pages:
                part = page.extract_text() or ''
                total += len(part)
                if total > 1_000_000:
                    raise ValidationError('Extracted content is too large.')
                parts.append(part)
            text = '\n'.join(parts)
        else:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                items = archive.infolist()
                if len(items) > 2000 or sum(i.file_size for i in items) > 40 * 1024 * 1024:
                    raise ValidationError('DOCX archive expands beyond safe limits.')
                if any(i.flag_bits & 1 for i in items):
                    raise ValidationError('Encrypted DOCX is not supported.')
                if any('vbaproject' in i.filename.lower() for i in items):
                    raise ValidationError('Macro-enabled documents are not supported.')
            doc = DocxDocument(io.BytesIO(raw))
            text = '\n'.join([p.text for p in doc.paragraphs] +
                [c.text for t in doc.tables for r in t.rows for c in r.cells])
    except ValidationError:
        raise
    except Exception:
        raise ValidationError('File is corrupted, unsupported or not readable. Export as UTF-8 TXT and retry.')
    return validate_text(text), ext[1:]
