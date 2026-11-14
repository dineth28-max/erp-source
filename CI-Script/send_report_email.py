#!/usr/bin/env python3
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path


def add_attachment(message: EmailMessage, path: Path) -> bool:
    if not path.exists():
        return False

    data = path.read_bytes()
    maintype, subtype = 'application', 'octet-stream'
    if path.suffix.lower() == '.pdf':
        maintype, subtype = 'application', 'pdf'
    elif path.suffix.lower() == '.html':
        maintype, subtype = 'text', 'html'

    message.add_attachment(data, maintype=maintype, subtype=subtype, filename=path.name)
    return True


def main():
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_password = os.environ.get('SMTP_PASSWORD', '')
    mail_to = os.environ.get('MAIL_TO', '')
    mail_from = os.environ.get('MAIL_FROM', smtp_user)

    report_pdf = Path(os.environ.get('REPORT_PDF', 'reports/test_report.pdf'))
    report_html = Path(os.environ.get('REPORT_HTML', 'reports/test_report.html'))

    ci_status = os.environ.get('CI_STATUS', 'UNKNOWN')
    sonar_result = os.environ.get('SONAR_JOB_RESULT', 'unknown')
    trivy_result = os.environ.get('TRIVY_JOB_RESULT', 'unknown')
    report_result = os.environ.get('REPORT_JOB_RESULT', 'unknown')

    if not all([smtp_user, smtp_password, mail_to]):
        print('Warning: Missing email configuration (SMTP_USER, SMTP_PASSWORD, MAIL_TO)')
        print('Skipping email notification')
        return

    status_line = f'CI STATUS: {ci_status}'
    separator = '=' * len(status_line)

    message = EmailMessage()
    message['Subject'] = os.environ.get('MAIL_SUBJECT', f'[CI {ci_status}] Code Quality Check Report')
    message['From'] = mail_from
    message['To'] = mail_to
    message.set_content(
        f'{separator}\n'
        f'{status_line}\n'
        f'{separator}\n\n'
        f'Job Results:\n'
        f'  SonarQube Analysis : {sonar_result.upper()}\n'
        f'  Trivy Security Scan: {trivy_result.upper()}\n'
        f'  Generate Report    : {report_result.upper()}\n\n'
        'The combined CI Quality & Security report is attached.\n'
        'Please review the report for code quality metrics (SonarQube) and\n'
        'source-code vulnerability findings (Trivy).\n'
    )

    attached_any = False
    attached_any = add_attachment(message, report_pdf) or attached_any
    attached_any = add_attachment(message, report_html) or attached_any

    if not attached_any:
        print('Warning: No report files found to attach.')
        print(f'  Checked: {report_pdf}')
        print(f'  Checked: {report_html}')
        return

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.send_message(message)
        print(f'✓ Notification email sent to {mail_to}')
    except Exception as e:
        print(f'Error sending email: {e}')


if __name__ == "__main__":
    main()
