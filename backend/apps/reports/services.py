import io
from xml.sax.saxutils import escape
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


def render_pdf(report):
    job = report.job
    result = job.result
    output = io.BytesIO()
    styles = getSampleStyleSheet()
    styles['Title'].textColor = colors.HexColor('#283982')
    story = []

    def line(text, style='BodyText'):
        story.append(Paragraph(escape(str(text)), styles[style]))
        story.append(Spacer(1, 10))

    line(settings.BRAND_NAME, 'Title')
    line('Content review report', 'Heading1')
    line('DEVELOPMENT MOCK — NOT A REAL DETECTION REPORT', 'Heading2') if result.get('mock') else None
    for label, value in [('Report ID', report.pk), ('Document', job.document.title),
                         ('Completed', job.completed_at), ('Check', job.kind), ('Provider', result.get('provider'))]:
        line(f'{label}: {value}')
    if job.kind in ['combined', 'plagiarism']:
        line(f'Similarity: {result.get("similarity") if result.get("similarity") is not None else "Unavailable"}')
    if job.kind in ['combined', 'ai']:
        line(f'AI likelihood: {result.get("ai_likelihood") if result.get("ai_likelihood") is not None else "Unavailable"}')
    for source in result.get('sources', []):
        line(source['title'], 'Heading3')
        line(source['url'])
        if source.get('passage'):
            line(source['passage'])
    if result.get('rewritten_text'):
        line('Rewritten text', 'Heading2')
        for paragraph in result['rewritten_text'].splitlines():
            line(paragraph)
    line(result.get('notes', ''))
    line(result.get('limitations', 'Results require human interpretation.'))
    SimpleDocTemplate(output, title=f'{settings.BRAND_NAME} report', author=settings.BRAND_NAME).build(story)
    return output.getvalue()
