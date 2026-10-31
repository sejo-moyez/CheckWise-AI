import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


@unittest.skipUnless(os.name == 'posix', 'Shell shim fixtures run on POSIX; native Windows setup is checked by CI.')
class SetupSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'project with spaces'
        self.root.mkdir()
        self.commands = Path(self.temp.name) / 'commands'
        self.commands.mkdir()
        self.helper = Path(__file__).resolve().parents[1] / 'python.sh'
        self.bash = shutil.which('bash')

    def tearDown(self):
        self.temp.cleanup()

    def executable(self, path, exit_code=0):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f'#!/bin/sh\nexit {exit_code}\n')
        path.chmod(0o755)

    def shell(self, script):
        return subprocess.run(
            [self.bash, '-c', 'source "$1"; PATH="$2"; ' + script, 'test', str(self.helper), str(self.commands), str(self.root)],
            capture_output=True, text=True, env={**os.environ, 'BASH_ENV': ''},
        )

    def test_windows_launcher_is_used_without_python3(self):
        self.executable(self.commands / 'py')
        response = self.shell('checkwise_system_python && printf "%s\\n" "${CHECKWISE_SYSTEM_PYTHON[@]}"')
        self.assertEqual(response.returncode, 0, response.stderr)
        self.assertEqual(response.stdout.splitlines(), ['py', '-3.12'])

    def test_python_fallback_when_python3_is_missing(self):
        self.executable(self.commands / 'python')
        response = self.shell('checkwise_system_python && printf "%s" "${CHECKWISE_SYSTEM_PYTHON[0]}"')
        self.assertEqual(response.returncode, 0, response.stderr)
        self.assertEqual(response.stdout, 'python')

    def test_missing_python_explains_the_prerequisite(self):
        response = self.shell('checkwise_system_python')
        self.assertNotEqual(response.returncode, 0)
        self.assertIn('Python 3.12 was not found', response.stderr)

    def test_windows_virtualenv_with_spaces_in_path(self):
        interpreter = self.root / '.venv' / 'Scripts' / 'python.exe'
        self.executable(interpreter)
        response = self.shell('checkwise_venv_python "$3" && printf "%s" "$CHECKWISE_PYTHON"')
        self.assertEqual(response.returncode, 0, response.stderr)
        self.assertEqual(response.stdout, str(interpreter))

    def test_posix_virtualenv_still_works(self):
        interpreter = self.root / '.venv' / 'bin' / 'python'
        self.executable(interpreter)
        response = self.shell('checkwise_venv_python "$3" && printf "%s" "$CHECKWISE_PYTHON"')
        self.assertEqual(response.returncode, 0, response.stderr)
        self.assertEqual(response.stdout, str(interpreter))

    def test_missing_virtualenv_stops_with_install_instructions(self):
        response = self.shell('checkwise_venv_python "$3"')
        self.assertNotEqual(response.returncode, 0)
        self.assertIn('bash scripts/install.sh', response.stderr)
