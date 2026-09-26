from django.core.management.base import BaseCommand

from integrations.ai import redact_secret, smoke_gemini


class Command(BaseCommand):
    help = "Send a tiny Gemini prompt. Prints ok or fail. Never prints the API key."

    def handle(self, *args, **options):
        try:
            text = smoke_gemini()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"fail: {redact_secret(str(exc))}"))
            raise SystemExit(1) from None
        if not text:
            self.stderr.write(self.style.ERROR("fail: empty model response"))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(f"ok: {redact_secret(text)}"))
