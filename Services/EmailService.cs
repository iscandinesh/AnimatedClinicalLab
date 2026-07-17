using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

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

    private string GetConnectionString()
    {
        var dbSection = _configuration.GetSection("DB_Connection");
        var server = dbSection["server"] ?? "127.0.0.1";
        var port = dbSection["port"] ?? "5432";
        var database = dbSection["database"] ?? "alpha_web";
        var username = dbSection["username"] ?? "postgres";
        var password = dbSection["password"] ?? "";

        return $"Host={server};Port={port};Database={database};Username={username};Password={password};Trust Server Certificate=true;";
    }

    private async Task EnsureTableCreatedAsync(NpgsqlConnection conn)
    {
        try
        {
            string createTableSql = @"
                CREATE TABLE IF NOT EXISTS mail_transaction
                (
                    mt_code             BIGSERIAL PRIMARY KEY,
                    tenant_code         TEXT,
                    mail_type           TEXT,
                    reference_table     TEXT,
                    reference_code      BIGINT,
                    from_email          TEXT,
                    to_email            TEXT,
                    cc_email            TEXT,
                    bcc_email           TEXT,
                    subject             TEXT,
                    body                TEXT,
                    attachment_name     TEXT,
                    attachment_path     TEXT,
                    smtp_provider       TEXT,
                    status              TEXT DEFAULT 'Pending',
                    error_message       TEXT,
                    sent_datetime       TIMESTAMP WITH TIME ZONE,
                    retry_count         INTEGER DEFAULT 0,
                    created_by          INTEGER,
                    created_date        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    modified_by         INTEGER,
                    modified_date       TIMESTAMP WITH TIME ZONE,
                    deleted             BOOLEAN DEFAULT FALSE
                );";

            using var cmd = new NpgsqlCommand(createTableSql, conn);
            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ensure mail_transaction table exists in DB");
        }
    }

    private async Task<long> InsertMailTransactionAsync(
        NpgsqlConnection conn,
        string tenantCode,
        string mailType,
        string fromEmail,
        string toEmail,
        string ccEmail,
        string subject,
        string body,
        string smtpProvider,
        int createdBy)
    {
        try
        {
            string insertSql = @"
                INSERT INTO mail_transaction 
                (
                    tenant_code, mail_type, from_email, to_email, cc_email,
                    subject, body, smtp_provider, status, created_by, created_date
                )
                VALUES 
                (
                    @tenant_code, @mail_type, @from_email, @to_email, @cc_email,
                    @subject, @body, @smtp_provider, 'Pending', @created_by, CURRENT_TIMESTAMP
                )
                RETURNING mt_code;";

            using var cmd = new NpgsqlCommand(insertSql, conn);
            cmd.Parameters.AddWithValue("tenant_code", tenantCode);
            cmd.Parameters.AddWithValue("mail_type", mailType);
            cmd.Parameters.AddWithValue("from_email", fromEmail);
            cmd.Parameters.AddWithValue("to_email", toEmail);
            cmd.Parameters.AddWithValue("cc_email", ccEmail ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("subject", subject);
            cmd.Parameters.AddWithValue("body", body ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("smtp_provider", smtpProvider ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("created_by", createdBy);

            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt64(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to insert mail transaction record in DB");
            return 0;
        }
    }

    private async Task UpdateMailTransactionStatusAsync(NpgsqlConnection conn, long mtCode, string status, string? errorMessage = null)
    {
        if (mtCode == 0) return;

        try
        {
            string updateSql = @"
                UPDATE mail_transaction
                SET status = @status,
                    error_message = @error_message,
                    sent_datetime = @sent_datetime,
                    modified_date = CURRENT_TIMESTAMP
                WHERE mt_code = @mt_code;";

            using var cmd = new NpgsqlCommand(updateSql, conn);
            cmd.Parameters.AddWithValue("status", status);
            cmd.Parameters.AddWithValue("error_message", errorMessage ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("sent_datetime", status == "Sent" ? DateTimeOffset.UtcNow : (object)DBNull.Value);
            cmd.Parameters.AddWithValue("mt_code", mtCode);

            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update mail transaction record status for mt_code {mtCode}", mtCode);
        }
    }

    public async Task SendContactFormEmailAsync(
        string fullName, 
        string phoneNumber, 
        string emailAddress, 
        string subject, 
        string message,
        string? homeAddress = null,
        string? collectionDate = null,
        string? collectionTime = null)
    {
        var smtpSection = _configuration.GetSection("SmtpSettings");

        string host = smtpSection["Host"] ?? string.Empty;
        int port = int.TryParse(smtpSection["Port"], out var p) ? p : 587;
        bool enableSsl = bool.TryParse(smtpSection["EnableSsl"], out var ssl) ? ssl : true;
        string username = smtpSection["Username"] ?? string.Empty;
        string password = smtpSection["Password"] ?? string.Empty;
        string fromEmail = smtpSection["FromEmail"] ?? string.Empty;

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            fromEmail = username;
        }

        // Determine SMTP provider name for database logging
        string smtpProvider = "SMTP";
        if (host.Contains("office365", StringComparison.OrdinalIgnoreCase) || host.Contains("outlook", StringComparison.OrdinalIgnoreCase))
        {
            smtpProvider = "Microsoft365";
        }
        else if (host.Contains("gmail", StringComparison.OrdinalIgnoreCase))
        {
            smtpProvider = "Gmail";
        }
        else if (host.Contains("sendgrid", StringComparison.OrdinalIgnoreCase))
        {
            smtpProvider = "SendGrid";
        }

        // Prepare combined email subject and body
        var emailSubject = $"New Inquiry: {subject}";
        
        var extraDetailsHtml = "";
        if (!string.IsNullOrWhiteSpace(homeAddress))
        {
            extraDetailsHtml += $@"
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Home Address:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{homeAddress}</td>
        </tr>";
        }
        if (!string.IsNullOrWhiteSpace(collectionDate))
        {
            extraDetailsHtml += $@"
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Collection Date:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{collectionDate}</td>
        </tr>";
        }
        if (!string.IsNullOrWhiteSpace(collectionTime))
        {
            extraDetailsHtml += $@"
        <tr>
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Collection Time:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{collectionTime}</td>
        </tr>";
        }

        var emailHtmlBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;"">
    <h2 style=""color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;"">Inquiry Received</h2>
    <p>Dear {fullName},</p>
    <p>Thank you for contacting <strong>Alpha Diagnostics Centre</strong>. We have received your inquiry regarding <strong>{subject}</strong>. A copy of this request has been forwarded to our team.</p>
    
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
            <td style=""padding: 8px 0; font-weight: bold; color: #475569;"">Subject / Test:</td>
            <td style=""padding: 8px 0; color: #0f172a;"">{subject}</td>
        </tr>
        {extraDetailsHtml}
    </table>
    
    <div style=""margin-top: 20px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px;"">
        <h4 style=""margin: 0 0 10px 0; color: #475569;"">Message:</h4>
        <p style=""margin: 0; color: #0f172a; line-height: 1.6; white-space: pre-wrap;"">{message}</p>
    </div>
    
    <hr style=""margin-top: 25px; border: 0; border-top: 1px solid #e2e8f0;"" />
    <p style=""font-size: 0.85em; color: #64748b; margin-top: 15px;"">
        <strong>Alpha Diagnostics Centre</strong><br/>
        Office: 16, Patel Street, Erode – 638 001.<br/>
        Phone: 70944 90917 | 81108 99999<br/>
        Email: info@alphadiagnosticscentre.com
    </p>
</div>";

        // 1. Database-First insertion
        NpgsqlConnection? conn = null;
        long txId = 0;
        try
        {
            string connStr = GetConnectionString();
            conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await EnsureTableCreatedAsync(conn);

            txId = await InsertMailTransactionAsync(
                conn,
                tenantCode: "1",
                mailType: "Notification",
                fromEmail: fromEmail,
                toEmail: emailAddress,
                ccEmail: fromEmail,
                subject: emailSubject,
                body: emailHtmlBody,
                smtpProvider: smtpProvider,
                createdBy: 1
            );
        }
        catch (Exception dbEx)
        {
            _logger.LogError(dbEx, "Failed to connect to database or log mail transaction. Proceeding with SMTP attempt anyway.");
        }

        // 2. SMTP Attempt
        try
        {
            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                var errorMsg = "SMTP is not configured in appsettings.json. Please configure SmtpSettings.";
                _logger.LogWarning(errorMsg);
                if (conn != null && txId > 0)
                {
                    await UpdateMailTransactionStatusAsync(conn, txId, "Failed", errorMsg);
                }
                return;
            }

            var mimeMessage = new MimeMessage();
            mimeMessage.From.Add(new MailboxAddress("Alpha Diagnostics Centre", fromEmail));
            mimeMessage.To.Add(new MailboxAddress(fullName, emailAddress));
            mimeMessage.Cc.Add(new MailboxAddress("Alpha Diagnostics Info", fromEmail));
            mimeMessage.Subject = emailSubject;

            var bodyBuilder = new BodyBuilder { HtmlBody = emailHtmlBody };
            mimeMessage.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();

            SecureSocketOptions options;
            if (!enableSsl)
            {
                options = SecureSocketOptions.None;
            }
            else if (port == 465)
            {
                options = SecureSocketOptions.SslOnConnect;
            }
            else
            {
                options = SecureSocketOptions.StartTls;
            }

            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            await client.ConnectAsync(host, port, options);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(mimeMessage);

            if (conn != null && txId > 0)
            {
                await UpdateMailTransactionStatusAsync(conn, txId, "Sent");
            }

            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email inquiry through SMTP. The transaction will be marked as Failed in DB.");
            if (conn != null && txId > 0)
            {
                await UpdateMailTransactionStatusAsync(conn, txId, "Failed", ex.Message);
            }
            // DO NOT THROW! The DB insertion is primary, and we want to fail gracefully.
        }
        finally
        {
            if (conn != null)
            {
                await conn.DisposeAsync();
            }
        }
    }

    public async Task<List<MailTransaction>> GetMailTransactionsAsync()
    {
        var list = new List<MailTransaction>();
        try
        {
            string connStr = GetConnectionString();
            using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await EnsureTableCreatedAsync(conn);

            // Fetch only non-deleted transactions
            string selectSql = @"
                SELECT mt_code, tenant_code, mail_type, reference_table, reference_code, 
                       from_email, to_email, cc_email, bcc_email, subject, body, 
                       attachment_name, attachment_path, smtp_provider, status, 
                       error_message, sent_datetime, retry_count, created_by, 
                       created_date, modified_by, modified_date, deleted
                FROM mail_transaction
                WHERE deleted = FALSE OR deleted IS NULL
                ORDER BY created_date DESC;";

            using var cmd = new NpgsqlCommand(selectSql, conn);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var tx = new MailTransaction
                {
                    MtCode = reader.GetInt64(0),
                    TenantCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    MailType = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ReferenceTable = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    ReferenceCode = reader.IsDBNull(4) ? 0 : reader.GetInt64(4),
                    FromEmail = reader.IsDBNull(5) ? "" : reader.GetString(5),
                    ToEmail = reader.IsDBNull(6) ? "" : reader.GetString(6),
                    CcEmail = reader.IsDBNull(7) ? "" : reader.GetString(7),
                    BccEmail = reader.IsDBNull(8) ? "" : reader.GetString(8),
                    Subject = reader.IsDBNull(9) ? "" : reader.GetString(9),
                    Body = reader.IsDBNull(10) ? "" : reader.GetString(10),
                    AttachmentName = reader.IsDBNull(11) ? "" : reader.GetString(11),
                    AttachmentPath = reader.IsDBNull(12) ? "" : reader.GetString(12),
                    SmtpProvider = reader.IsDBNull(13) ? "" : reader.GetString(13),
                    Status = reader.IsDBNull(14) ? "" : reader.GetString(14),
                    ErrorMessage = reader.IsDBNull(15) ? "" : reader.GetString(15),
                    SentDatetime = reader.IsDBNull(16) ? null : reader.GetDateTime(16).AddHours(5).AddMinutes(30),
                    RetryCount = reader.IsDBNull(17) ? 0 : reader.GetInt32(17),
                    CreatedBy = reader.IsDBNull(18) ? 0 : reader.GetInt32(18),
                    CreatedDate = reader.GetDateTime(19).AddHours(5).AddMinutes(30),
                    ModifiedBy = reader.IsDBNull(20) ? 0 : reader.GetInt32(20),
                    ModifiedDate = reader.IsDBNull(21) ? null : reader.GetDateTime(21).AddHours(5).AddMinutes(30),
                    Deleted = reader.IsDBNull(22) ? false : reader.GetBoolean(22)
                };

                // Parse the client details from HTML body
                var parsed = MailTransaction.ParseBody(tx.Body);
                tx.ClientName = parsed.Name;
                tx.ClientContact = parsed.Contact;
                tx.ClientMessage = parsed.Message;

                list.Add(tx);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve mail transactions from DB");
        }
        return list;
    }

    public async Task<bool> DeleteMailTransactionAsync(long mtCode)
    {
        try
        {
            string connStr = GetConnectionString();
            using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // We do a soft delete
            string deleteSql = @"
                UPDATE mail_transaction
                SET deleted = TRUE,
                    modified_date = CURRENT_TIMESTAMP
                WHERE mt_code = @mt_code;";

            using var cmd = new NpgsqlCommand(deleteSql, conn);
            cmd.Parameters.AddWithValue("mt_code", mtCode);
            int rowsAffected = await cmd.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete mail transaction mt_code {mtCode}", mtCode);
            return false;
        }
    }
}

public class MailTransaction
{
    public long MtCode { get; set; }
    public string TenantCode { get; set; } = "";
    public string MailType { get; set; } = "";
    public string ReferenceTable { get; set; } = "";
    public long ReferenceCode { get; set; }
    public string FromEmail { get; set; } = "";
    public string ToEmail { get; set; } = "";
    public string CcEmail { get; set; } = "";
    public string BccEmail { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public string AttachmentName { get; set; } = "";
    public string AttachmentPath { get; set; } = "";
    public string SmtpProvider { get; set; } = "";
    public string Status { get; set; } = "";
    public string ErrorMessage { get; set; } = "";
    public DateTime? SentDatetime { get; set; }
    public int RetryCount { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public int ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public bool Deleted { get; set; }

    // Parsed fields
    public string ClientName { get; set; } = "";
    public string ClientContact { get; set; } = "";
    public string ClientMessage { get; set; } = "";

    public static (string Name, string Contact, string Message) ParseBody(string body)
    {
        if (string.IsNullOrEmpty(body)) return ("", "", "");

        string name = "";
        string contact = "";
        string message = "";

        try
        {
            // Extract Full Name
            var nameMatch = System.Text.RegularExpressions.Regex.Match(body, @"Full\s+Name:.*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (nameMatch.Success)
            {
                name = nameMatch.Groups[1].Value.Trim();
            }

            // Extract Phone Number
            var contactMatch = System.Text.RegularExpressions.Regex.Match(body, @"Phone\s+Number:.*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (contactMatch.Success)
            {
                contact = contactMatch.Groups[1].Value.Trim();
            }

            // Extract Message
            var messageMatch = System.Text.RegularExpressions.Regex.Match(body, @"Message:.*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (messageMatch.Success)
            {
                message = messageMatch.Groups[1].Value.Trim();
            }
        }
        catch
        {
            // Ignore parsing errors and return empty/partial strings
        }

        return (name, contact, message);
    }
}
