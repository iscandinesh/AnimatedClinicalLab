using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AlphaRazor.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendContactFormEmailAsync(string fullName, string phoneNumber, string emailAddress, string subject, string message)
    {
        var smtpSection = _configuration.GetSection("SmtpSettings");
        
        string host = smtpSection["Host"] ?? string.Empty;
        int port = int.TryParse(smtpSection["Port"], out var p) ? p : 587;
        bool enableSsl = bool.TryParse(smtpSection["EnableSsl"], out var ssl) ? ssl : true;
        string username = smtpSection["Username"] ?? string.Empty;
        string password = smtpSection["Password"] ?? string.Empty;
        string fromEmail = smtpSection["FromEmail"] ?? string.Empty;
        string toEmail = smtpSection["ToEmail"] ?? "info@alphadiagnosticscentre.com";

        // Check validation
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            var errorMsg = "SMTP is not configured in appsettings.json. Please configure SmtpSettings:Host, Username, and Password to send emails.";
            _logger.LogError(errorMsg);
            throw new InvalidOperationException(errorMsg);
        }

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            fromEmail = username;
        }

        var mimeMessage = new MimeMessage();
        mimeMessage.From.Add(new MailboxAddress("Alpha Diagnostics Contact Form", fromEmail));
        mimeMessage.To.Add(new MailboxAddress("Alpha Diagnostics Info", toEmail));
        mimeMessage.Subject = $"New Inquiry: {subject}";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;"">
    <h2 style=""color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;"">New Contact Form Submission</h2>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 15px;"">
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569; width: 150px;"">Full Name:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{fullName}</td>
        </tr>
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Phone Number:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{phoneNumber}</td>
        </tr>
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Email Address:</td>
            <td style=""padding: 8px 0; color: #0f172a;""><a href=""mailto:{emailAddress}"" style=""color: #2563eb; text-decoration: none;"">{emailAddress}</a></td>
        </tr>
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Subject:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{subject}</td>
        </tr>
    </table>
    <div style=""margin-top: 20px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px;"">
        <h4 style=""margin: 0 0 10px 0; color: #475569;"">Message:</h4>
        <p style=""margin: 0; color: #0f172a; line-height: 1.6; white-space: pre-wrap;"">{message}</p>
    </div>
</div>"
        };

        mimeMessage.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        
        // Determine the secure socket options based on port and ssl settings.
        SecureSocketOptions options;
        if (!enableSsl)
        {
            options = SecureSocketOptions.None;
        }
        else if (port == 465)
        {
            options = SecureSocketOptions.SslOnConnect; // Implicit SSL/TLS
        }
        else
        {
            options = SecureSocketOptions.StartTls; // STARTTLS for port 587 or 25
        }

        // Bypass SSL certificate validation if there's any certificate mismatch issue (helps prevent SSL errors on local setups or self-signed certs)
        client.ServerCertificateValidationCallback = (s, c, h, e) => true;

        await client.ConnectAsync(host, port, options);
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(mimeMessage);
        await client.DisconnectAsync(true);
    }
}
