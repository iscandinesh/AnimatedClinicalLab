using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace AlphaRazor.Services;

public class BlogPost
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string SubTitle { get; set; } = "";
    public string Category { get; set; } = "";
    public string CategoryBadge { get; set; } = "";
    public string Tags { get; set; } = ""; // Comma-separated tags
    public string AuthorName { get; set; } = "";
    public string AuthorTitle { get; set; } = "";
    public string AuthorAvatar { get; set; } = "";
    public string Date { get; set; } = "";
    public string ReadTime { get; set; } = "";
    public string ImagePath { get; set; } = "";
    public byte[]? ImageData { get; set; }
    public string IconClass { get; set; } = "";
    public string IconColor { get; set; } = "";
    public string GradientStart { get; set; } = "";
    public string GradientEnd { get; set; } = "";
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; }
    public int SortOrder { get; set; } = 0;
}

public class BlogPostDetails
{
    public int BlogId { get; set; }
    public string ContentHtml { get; set; } = "";
    public string Introduction { get; set; } = "";
    public string Conclusion { get; set; } = "";
    public string DetailedSectionsJson { get; set; } = "[]";
}

public class BlogDbService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<BlogDbService> _logger;

    public event Func<Task>? OnBlogChanged;

    public BlogDbService(IConfiguration configuration, ILogger<BlogDbService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private string GetConnectionString()
    {
        var dbSection = _configuration.GetSection("DB_Connection");
        var server = dbSection["server"] ?? "127.0.0.1";
        var port = dbSection["port"] ?? "5432";
        var database = dbSection["database"] ?? "MasterTenantDB";
        var username = dbSection["username"] ?? "postgres";
        var password = dbSection["password"] ?? "";

        return $"Host={server};Port={port};Database={database};Username={username};Password={password};Trust Server Certificate=true;";
    }

    public async Task InitializeDatabaseAsync()
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            _logger.LogInformation("Creating tables if they do not exist...");

            // Create blogs_posts
            string createPostsSql = @"
                CREATE TABLE IF NOT EXISTS blogs_posts (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    category TEXT,
                    category_badge TEXT,
                    tags TEXT,
                    author_name TEXT,
                    author_title TEXT,
                    author_avatar TEXT,
                    date TEXT,
                    read_time TEXT,
                    image_path TEXT,
                    image_data BYTEA,
                    icon_class TEXT,
                    icon_color TEXT,
                    gradient_start TEXT,
                    gradient_end TEXT,
                    is_featured BOOLEAN DEFAULT FALSE,
                    is_published BOOLEAN DEFAULT TRUE
                );";
            using (var cmd = new NpgsqlCommand(createPostsSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            // Alter table to add image_data if it doesn't exist
            string alterSql = "ALTER TABLE blogs_posts ADD COLUMN IF NOT EXISTS image_data BYTEA;";
            using (var cmd = new NpgsqlCommand(alterSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            // Alter table to add sub_title if it doesn't exist
            string alterSubTitle = "ALTER TABLE blogs_posts ADD COLUMN IF NOT EXISTS sub_title TEXT;";
            using (var cmd = new NpgsqlCommand(alterSubTitle, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            string alterPublished = "ALTER TABLE blogs_posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;";
            using (var cmd = new NpgsqlCommand(alterPublished, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            // Alter table to add sort_order if it doesn't exist
            string alterSortOrderSql = "ALTER TABLE blogs_posts ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;";
            using (var cmd = new NpgsqlCommand(alterSortOrderSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }
            string initSortOrderSql = "UPDATE blogs_posts SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL;";
            using (var cmd = new NpgsqlCommand(initSortOrderSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            // Create blogs_details
            string createDetailsSql = @"
                CREATE TABLE IF NOT EXISTS blogs_details (
                    blog_id INT PRIMARY KEY REFERENCES blogs_posts(id) ON DELETE CASCADE,
                    content_html TEXT,
                    introduction TEXT,
                    conclusion TEXT,
                    detailed_sections JSONB
                );";
            using (var cmd = new NpgsqlCommand(createDetailsSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            // Create marketing_users
            string createUsersSql = @"
                CREATE TABLE IF NOT EXISTS marketing_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(100)
                );";
            using (var cmd = new NpgsqlCommand(createUsersSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            // Seed default marketing user
            string checkUserSql = "SELECT COUNT(*) FROM marketing_users;";
            long userCount = 0;
            using (var cmd = new NpgsqlCommand(checkUserSql, conn))
            {
                userCount = Convert.ToInt64(await cmd.ExecuteScalarAsync());
            }

            if (userCount == 0)
            {
                _logger.LogInformation("Seeding default marketing user...");
                string insertUserSql = "INSERT INTO marketing_users (username, password, name) VALUES ('admin', 'admin123', 'Administrator');";
                using var cmd = new NpgsqlCommand(insertUserSql, conn);
                await cmd.ExecuteNonQueryAsync();
            }

            // Seed initial blog posts from BlogFile.json if empty
            string checkBlogsSql = "SELECT COUNT(*) FROM blogs_posts;";
            long blogCount = 0;
            using (var cmd = new NpgsqlCommand(checkBlogsSql, conn))
            {
                blogCount = Convert.ToInt64(await cmd.ExecuteScalarAsync());
            }

            if (blogCount == 0)
            {
                _logger.LogInformation("Seeding initial blogs from BlogFile.json...");
                await SeedInitialBlogsAsync(conn);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize database tables or seed data.");
        }
    }

    private async Task SeedInitialBlogsAsync(NpgsqlConnection conn)
    {
        try
        {
            var jsonPath = Path.Combine(AppContext.BaseDirectory, "Properties", "Blogs", "BlogFile.json");
            if (!File.Exists(jsonPath))
            {
                jsonPath = Path.Combine("Properties", "Blogs", "BlogFile.json");
            }

            if (!File.Exists(jsonPath))
            {
                _logger.LogWarning($"Seed JSON file not found at: {jsonPath}");
                return;
            }

            var jsonContent = await File.ReadAllTextAsync(jsonPath);
            using var doc = JsonDocument.Parse(jsonContent);
            foreach (var element in doc.RootElement.EnumerateArray())
            {
                int id = element.GetProperty("id").GetInt32();
                bool isFeatured = element.GetProperty("isFeatured").GetBoolean();
                string category = element.GetProperty("category").GetString() ?? "";
                string categoryBadge = element.GetProperty("categoryBadge").GetString() ?? "";
                
                var tagsList = new List<string>();
                foreach (var t in element.GetProperty("tags").EnumerateArray())
                {
                    tagsList.Add(t.GetString() ?? "");
                }
                string tags = string.Join(",", tagsList);

                string title = element.GetProperty("title").GetString() ?? "";
                string description = element.GetProperty("description").GetString() ?? "";
                string authorName = element.GetProperty("authorName").GetString() ?? "";
                string authorTitle = element.GetProperty("authorTitle").GetString() ?? "";
                string authorAvatar = element.GetProperty("authorAvatar").GetString() ?? "";
                string date = element.GetProperty("date").GetString() ?? "";
                string readTime = element.GetProperty("readTime").GetString() ?? "";
                string imagePath = element.GetProperty("imagePath").GetString() ?? "";
                string iconClass = element.GetProperty("iconClass").GetString() ?? "";
                string iconColor = element.GetProperty("iconColor").GetString() ?? "";
                string gradientStart = element.GetProperty("gradientStart").GetString() ?? "";
                string gradientEnd = element.GetProperty("gradientEnd").GetString() ?? "";

                string introduction = element.GetProperty("introduction").GetString() ?? "";
                string conclusion = element.GetProperty("conclusion").GetString() ?? "";
                
                var detailedSections = element.GetProperty("detailedSections");
                string detailedSectionsJson = detailedSections.GetRawText();

                // Construct initial HTML content for rich text editor
                var sb = new StringBuilder();
                sb.Append($"<p class=\"lead\">{introduction}</p>");
                foreach (var sec in detailedSections.EnumerateArray())
                {
                    string h = sec.GetProperty("heading").GetString() ?? "";
                    string c = sec.GetProperty("content").GetString() ?? "";
                    sb.Append($"<h3>{h}</h3>");
                    sb.Append($"<p>{c}</p>");
                }
                sb.Append($"<h3>Conclusion</h3>");
                sb.Append($"<p>{conclusion}</p>");
                string contentHtml = sb.ToString();

                // Insert post
                string insertPostSql = @"
                    INSERT INTO blogs_posts (id, title, category, category_badge, tags, author_name, author_title, author_avatar, date, read_time, image_path, icon_class, icon_color, gradient_start, gradient_end, is_featured)
                    VALUES (@id, @title, @category, @category_badge, @tags, @author_name, @author_title, @author_avatar, @date, @read_time, @image_path, @icon_class, @icon_color, @gradient_start, @gradient_end, @is_featured);";
                
                using (var cmd = new NpgsqlCommand(insertPostSql, conn))
                {
                    cmd.Parameters.AddWithValue("id", id);
                    cmd.Parameters.AddWithValue("title", title);
                    cmd.Parameters.AddWithValue("category", category);
                    cmd.Parameters.AddWithValue("category_badge", categoryBadge);
                    cmd.Parameters.AddWithValue("tags", tags);
                    cmd.Parameters.AddWithValue("author_name", authorName);
                    cmd.Parameters.AddWithValue("author_title", authorTitle);
                    cmd.Parameters.AddWithValue("author_avatar", authorAvatar);
                    cmd.Parameters.AddWithValue("date", date);
                    cmd.Parameters.AddWithValue("read_time", readTime);
                    cmd.Parameters.AddWithValue("image_path", imagePath);
                    cmd.Parameters.AddWithValue("icon_class", iconClass);
                    cmd.Parameters.AddWithValue("icon_color", iconColor);
                    cmd.Parameters.AddWithValue("gradient_start", gradientStart);
                    cmd.Parameters.AddWithValue("gradient_end", gradientEnd);
                    cmd.Parameters.AddWithValue("is_featured", isFeatured);
                    await cmd.ExecuteNonQueryAsync();
                }

                // Insert details
                string insertDetailsSql = @"
                    INSERT INTO blogs_details (blog_id, content_html, introduction, conclusion, detailed_sections)
                    VALUES (@blog_id, @content_html, @introduction, @conclusion, CAST(@detailed_sections AS jsonb));";
                
                using (var cmd = new NpgsqlCommand(insertDetailsSql, conn))
                {
                    cmd.Parameters.AddWithValue("blog_id", id);
                    cmd.Parameters.AddWithValue("content_html", contentHtml);
                    cmd.Parameters.AddWithValue("introduction", introduction);
                    cmd.Parameters.AddWithValue("conclusion", conclusion);
                    cmd.Parameters.AddWithValue("detailed_sections", detailedSectionsJson);
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // Sync serial sequence
            string syncSeqSql = "SELECT setval(pg_get_serial_sequence('blogs_posts', 'id'), COALESCE(MAX(id), 1)) FROM blogs_posts;";
            using (var cmd = new NpgsqlCommand(syncSeqSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during seeding database.");
        }
    }

    public async Task<bool> ValidateLoginAsync(string username, string password)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            string query = "SELECT COUNT(*) FROM marketing_users WHERE username = @username AND password = @password;";
            using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("username", username);
            cmd.Parameters.AddWithValue("password", password);

            long count = Convert.ToInt64(await cmd.ExecuteScalarAsync());
            return count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating login credentials");
            return false;
        }
    }

    public async Task<List<BlogPost>> GetBlogsAsync(bool publishedOnly = false)
    {
        var blogs = new List<BlogPost>();
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            // Self-healing: ensure sort_order column exists (idempotent)
            using (var altCmd = new NpgsqlCommand(
                "ALTER TABLE blogs_posts ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;", conn))
            {
                await altCmd.ExecuteNonQueryAsync();
            }
            // Initialise sort_order=0 rows so ordering works immediately
            using (var initCmd = new NpgsqlCommand(
                "UPDATE blogs_posts SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL;", conn))
            {
                await initCmd.ExecuteNonQueryAsync();
            }

            string query = "SELECT id, title, sub_title, category, category_badge, tags, author_name, author_title, author_avatar, date, read_time, image_path, icon_class, icon_color, gradient_start, gradient_end, is_featured, image_data, COALESCE(sort_order, id) as sort_order, COALESCE(is_published, TRUE) FROM blogs_posts" + (publishedOnly ? " WHERE COALESCE(is_published, TRUE) = TRUE" : "") + " ORDER BY COALESCE(sort_order, id) ASC;";
            using var cmd = new NpgsqlCommand(query, conn);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var blog = new BlogPost
                {
                    Id = reader.GetInt32(0),
                    Title = reader.GetString(1),
                    SubTitle = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    Category = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    CategoryBadge = reader.IsDBNull(4) ? "" : reader.GetString(4),
                    Tags = reader.IsDBNull(5) ? "" : reader.GetString(5),
                    AuthorName = reader.IsDBNull(6) ? "" : reader.GetString(6),
                    AuthorTitle = reader.IsDBNull(7) ? "" : reader.GetString(7),
                    AuthorAvatar = reader.IsDBNull(8) ? "" : reader.GetString(8),
                    Date = reader.IsDBNull(9) ? "" : reader.GetString(9),
                    ReadTime = reader.IsDBNull(10) ? "" : reader.GetString(10),
                    ImagePath = MapImagePath(reader.IsDBNull(11) ? "" : reader.GetString(11)),
                    IconClass = reader.IsDBNull(12) ? "" : reader.GetString(12),
                    IconColor = reader.IsDBNull(13) ? "" : reader.GetString(13),
                    GradientStart = reader.IsDBNull(14) ? "" : reader.GetString(14),
                    GradientEnd = reader.IsDBNull(15) ? "" : reader.GetString(15),
                    IsFeatured = reader.GetBoolean(16),
                    IsPublished = reader.GetBoolean(19)
                };

                byte[]? imgData = reader.IsDBNull(17) ? null : (byte[])reader[17];
                blog.ImageData = imgData;
                blog.SortOrder = reader.IsDBNull(18) ? blog.Id : reader.GetInt32(18);
                if (imgData != null && imgData.Length > 0)
                {
                    blog.ImagePath = $"data:{DetectImageMimeType(imgData)};base64,{Convert.ToBase64String(imgData)}";
                }

                blogs.Add(blog);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting list of blogs from database");
        }
        return blogs;
    }

    public async Task<BlogPost?> GetBlogByIdAsync(int id, bool publishedOnly = false)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            string query = "SELECT id, title, sub_title, category, category_badge, tags, author_name, author_title, author_avatar, date, read_time, image_path, icon_class, icon_color, gradient_start, gradient_end, is_featured, image_data, COALESCE(sort_order, id) as sort_order, COALESCE(is_published, TRUE) FROM blogs_posts WHERE id = @id" + (publishedOnly ? " AND COALESCE(is_published, TRUE) = TRUE" : "") + ";";
            using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("id", id);

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var blog = new BlogPost
                {
                    Id = reader.GetInt32(0),
                    Title = reader.GetString(1),
                    SubTitle = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    Category = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    CategoryBadge = reader.IsDBNull(4) ? "" : reader.GetString(4),
                    Tags = reader.IsDBNull(5) ? "" : reader.GetString(5),
                    AuthorName = reader.IsDBNull(6) ? "" : reader.GetString(6),
                    AuthorTitle = reader.IsDBNull(7) ? "" : reader.GetString(7),
                    AuthorAvatar = reader.IsDBNull(8) ? "" : reader.GetString(8),
                    Date = reader.IsDBNull(9) ? "" : reader.GetString(9),
                    ReadTime = reader.IsDBNull(10) ? "" : reader.GetString(10),
                    ImagePath = MapImagePath(reader.IsDBNull(11) ? "" : reader.GetString(11)),
                    IconClass = reader.IsDBNull(12) ? "" : reader.GetString(12),
                    IconColor = reader.IsDBNull(13) ? "" : reader.GetString(13),
                    GradientStart = reader.IsDBNull(14) ? "" : reader.GetString(14),
                    GradientEnd = reader.IsDBNull(15) ? "" : reader.GetString(15),
                    IsFeatured = reader.GetBoolean(16),
                    IsPublished = reader.GetBoolean(19)
                };

                byte[]? imgData = reader.IsDBNull(17) ? null : (byte[])reader[17];
                blog.ImageData = imgData;
                blog.SortOrder = reader.IsDBNull(18) ? blog.Id : reader.GetInt32(18);
                if (imgData != null && imgData.Length > 0)
                {
                    blog.ImagePath = $"data:{DetectImageMimeType(imgData)};base64,{Convert.ToBase64String(imgData)}";
                }

                return blog;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting blog post by id {id} from database", id);
        }
        return null;
    }

    public async Task<BlogPostDetails?> GetBlogDetailsAsync(int blogId)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            string query = "SELECT blog_id, content_html, introduction, conclusion, detailed_sections FROM blogs_details WHERE blog_id = @blog_id;";
            using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("blog_id", blogId);

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new BlogPostDetails
                {
                    BlogId = reader.GetInt32(0),
                    ContentHtml = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    Introduction = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    Conclusion = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    DetailedSectionsJson = reader.IsDBNull(4) ? "[]" : reader.GetString(4)
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting blog details from database for id {blogId}", blogId);
        }
        return null;
    }

    public static string DetectImageMimeType(byte[] data)
    {
        if (data.Length >= 4)
        {
            // PNG: 89 50 4E 47
            if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) return "image/png";
            // JPEG: FF D8
            if (data[0] == 0xFF && data[1] == 0xD8) return "image/jpeg";
            // GIF: 47 49 46
            if (data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46) return "image/gif";
            // WebP: 52 49 46 46 ... 57 45 42 50
            if (data.Length >= 12 && data[0] == 0x52 && data[1] == 0x49 && data[8] == 0x57 && data[9] == 0x45) return "image/webp";
        }
        return "image/jpeg"; // default fallback
    }

    public static string MapImagePath(string path)
    {
        if (string.IsNullOrEmpty(path))
            return string.Empty;

        if (path.StartsWith("/BlogImages/"))
        {
            return path.Replace("/BlogImages/", "") switch
            {
                "1.jpg" => "images/indian-cardiac-checkup.jpg",
                "2.jpg" => "images/tamil-diabetic-health.png",
                "3.jpg" => "images/tamil-family-checkup.jpg",
                "4.jpg" => "images/tamil-well-women.png",
                "vitamin-d.jpg" => "images/services-banner.jpg",
                _ => path
            };
        }
        return path;
    }

    public async Task<int> CreateBlogAsync(BlogPost post, BlogPostDetails details)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            string insertPostSql = @"
                INSERT INTO blogs_posts (title, sub_title, category, category_badge, tags, author_name, author_title, author_avatar, date, read_time, image_path, icon_class, icon_color, gradient_start, gradient_end, is_featured, is_published, image_data)
                VALUES (@title, @sub_title, @category, @category_badge, @tags, @author_name, @author_title, @author_avatar, @date, @read_time, @image_path, @icon_class, @icon_color, @gradient_start, @gradient_end, @is_featured, @is_published, @image_data)
                RETURNING id;";
            
            int newId = 0;
            using (var cmd = new NpgsqlCommand(insertPostSql, conn))
            {
                cmd.Parameters.AddWithValue("title", post.Title ?? "");
                cmd.Parameters.AddWithValue("sub_title", (object?)(post.SubTitle) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("category", post.Category ?? "");
                cmd.Parameters.AddWithValue("category_badge", post.CategoryBadge ?? "");
                cmd.Parameters.AddWithValue("tags", post.Tags ?? "");
                cmd.Parameters.AddWithValue("author_name", post.AuthorName ?? "");
                cmd.Parameters.AddWithValue("author_title", post.AuthorTitle ?? "");
                cmd.Parameters.AddWithValue("author_avatar", post.AuthorAvatar ?? "");
                cmd.Parameters.AddWithValue("date", post.Date ?? "");
                cmd.Parameters.AddWithValue("read_time", post.ReadTime ?? "");
                // Don't store redundant data-URL in image_path if binary data is stored separately
                var imagePath = (post.ImageData != null && post.ImageData.Length > 0) ? "" : (post.ImagePath ?? "");
                cmd.Parameters.AddWithValue("image_path", imagePath);
                cmd.Parameters.AddWithValue("icon_class", post.IconClass ?? "");
                cmd.Parameters.AddWithValue("icon_color", post.IconColor ?? "");
                cmd.Parameters.AddWithValue("gradient_start", post.GradientStart ?? "");
                cmd.Parameters.AddWithValue("gradient_end", post.GradientEnd ?? "");
                cmd.Parameters.AddWithValue("is_featured", post.IsFeatured);
                cmd.Parameters.AddWithValue("is_published", post.IsPublished);
                cmd.Parameters.AddWithValue("image_data", (object?)post.ImageData ?? DBNull.Value);
                
                newId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            }

            string insertDetailsSql = @"
                INSERT INTO blogs_details (blog_id, content_html, introduction, conclusion, detailed_sections)
                VALUES (@blog_id, @content_html, @introduction, @conclusion, CAST(@detailed_sections AS jsonb));";
            
            using (var cmd = new NpgsqlCommand(insertDetailsSql, conn))
            {
                cmd.Parameters.AddWithValue("blog_id", newId);
                cmd.Parameters.AddWithValue("content_html", details.ContentHtml);
                cmd.Parameters.AddWithValue("introduction", details.Introduction);
                cmd.Parameters.AddWithValue("conclusion", details.Conclusion);
                cmd.Parameters.AddWithValue("detailed_sections", details.DetailedSectionsJson);
                await cmd.ExecuteNonQueryAsync();
            }

            if (newId > 0 && OnBlogChanged != null)
            {
                _ = Task.Run(async () => {
                    try { await OnBlogChanged.Invoke(); } catch { }
                });
            }

            return newId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating new blog post in database");
            return 0;
        }
    }

    public async Task<bool> SaveBlogAsync(BlogPost post, BlogPostDetails details)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            string updatePostSql = @"
                UPDATE blogs_posts
                SET title = @title,
                    sub_title = @sub_title,
                    category = @category,
                    category_badge = @category_badge,
                    tags = @tags,
                    author_name = @author_name,
                    author_title = @author_title,
                    author_avatar = @author_avatar,
                    date = @date,
                    read_time = @read_time,
                    image_path = @image_path,
                    icon_class = @icon_class,
                    icon_color = @icon_color,
                    gradient_start = @gradient_start,
                    gradient_end = @gradient_end,
                    is_featured = @is_featured,
                    is_published = @is_published,
                    image_data = @image_data
                WHERE id = @id;";
            
            using (var cmd = new NpgsqlCommand(updatePostSql, conn))
            {
                cmd.Parameters.AddWithValue("title", post.Title ?? "");
                cmd.Parameters.AddWithValue("sub_title", (object?)(post.SubTitle) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("category", post.Category ?? "");
                cmd.Parameters.AddWithValue("category_badge", post.CategoryBadge ?? "");
                cmd.Parameters.AddWithValue("tags", post.Tags ?? "");
                cmd.Parameters.AddWithValue("author_name", post.AuthorName ?? "");
                cmd.Parameters.AddWithValue("author_title", post.AuthorTitle ?? "");
                cmd.Parameters.AddWithValue("author_avatar", post.AuthorAvatar ?? "");
                cmd.Parameters.AddWithValue("date", post.Date ?? "");
                cmd.Parameters.AddWithValue("read_time", post.ReadTime ?? "");
                // Don't store redundant data-URL in image_path if binary data is stored separately
                var imagePath = (post.ImageData != null && post.ImageData.Length > 0) ? "" : (post.ImagePath ?? "");
                cmd.Parameters.AddWithValue("image_path", imagePath);
                cmd.Parameters.AddWithValue("icon_class", post.IconClass ?? "");
                cmd.Parameters.AddWithValue("icon_color", post.IconColor ?? "");
                cmd.Parameters.AddWithValue("gradient_start", post.GradientStart ?? "");
                cmd.Parameters.AddWithValue("gradient_end", post.GradientEnd ?? "");
                cmd.Parameters.AddWithValue("is_featured", post.IsFeatured);
                cmd.Parameters.AddWithValue("is_published", post.IsPublished);
                cmd.Parameters.AddWithValue("image_data", (object?)post.ImageData ?? DBNull.Value);
                cmd.Parameters.AddWithValue("id", post.Id);
                
                await cmd.ExecuteNonQueryAsync();
            }

            string updateDetailsSql = @"
                INSERT INTO blogs_details (blog_id, content_html, introduction, conclusion, detailed_sections)
                VALUES (@blog_id, @content_html, @introduction, @conclusion, CAST(@detailed_sections AS jsonb))
                ON CONFLICT (blog_id) 
                DO UPDATE SET 
                    content_html = EXCLUDED.content_html,
                    introduction = EXCLUDED.introduction,
                    conclusion = EXCLUDED.conclusion,
                    detailed_sections = EXCLUDED.detailed_sections;";
            
            using (var cmd = new NpgsqlCommand(updateDetailsSql, conn))
            {
                cmd.Parameters.AddWithValue("blog_id", post.Id);
                cmd.Parameters.AddWithValue("content_html", details.ContentHtml);
                cmd.Parameters.AddWithValue("introduction", details.Introduction);
                cmd.Parameters.AddWithValue("conclusion", details.Conclusion);
                cmd.Parameters.AddWithValue("detailed_sections", details.DetailedSectionsJson);
                await cmd.ExecuteNonQueryAsync();
            }

            if (OnBlogChanged != null)
            {
                _ = Task.Run(async () => {
                    try { await OnBlogChanged.Invoke(); } catch { }
                });
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving blog post with id {Id} in database", post.Id);
            return false;
        }
    }

    public async Task<bool> DeleteBlogAsync(int id)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            string deleteSql = "DELETE FROM blogs_posts WHERE id = @id;";
            using var cmd = new NpgsqlCommand(deleteSql, conn);
            cmd.Parameters.AddWithValue("id", id);

            int rows = await cmd.ExecuteNonQueryAsync();
            if (rows > 0 && OnBlogChanged != null)
            {
                _ = Task.Run(async () => {
                    try { await OnBlogChanged.Invoke(); } catch { }
                });
            }
            return rows > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting blog post with id {id}", id);
            return false;
        }
    }

    public async Task<bool> ReorderBlogsAsync(List<int> orderedIds)
    {
        try
        {
            using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();

            for (int i = 0; i < orderedIds.Count; i++)
            {
                string sql = "UPDATE blogs_posts SET sort_order = @sort_order WHERE id = @id;";
                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("sort_order", i + 1);
                cmd.Parameters.AddWithValue("id", orderedIds[i]);
                await cmd.ExecuteNonQueryAsync();
            }
            if (OnBlogChanged != null)
            {
                _ = Task.Run(async () => {
                    try { await OnBlogChanged.Invoke(); } catch { }
                });
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering blogs");
            return false;
        }
    }
}

