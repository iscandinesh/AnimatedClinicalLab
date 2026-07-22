using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AlphaRazor.Services;

public class SitemapUrl
{
    public string Loc { get; set; } = "";
    public string ChangeFreq { get; set; } = "weekly";
    public double Priority { get; set; } = 0.8;
    public string LastMod { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
}

public class SitemapService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SitemapService> _logger;

    private const string ConsolidatedCacheKey = "Sitemap_Consolidated_Xml";
    private const string IndexCacheKey = "Sitemap_Index_Xml";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(4);

    public SitemapService(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<SitemapService> logger)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public string Domain => (_configuration["SiteDomain"] ?? "https://www.alphadiagnosticscentre.com").TrimEnd('/');

    /// <summary>
    /// Gets the consolidated sitemap.xml containing all static pages and published blog posts.
    /// </summary>
    public async Task<string> GetConsolidatedSitemapXmlAsync()
    {
        if (_cache.TryGetValue(ConsolidatedCacheKey, out string? cachedXml) && !string.IsNullOrEmpty(cachedXml))
        {
            return cachedXml;
        }

        var urls = await GetAllUrlsAsync();
        var xml = BuildSitemapUrlSetXml(urls);

        _cache.Set(ConsolidatedCacheKey, xml, CacheDuration);
        return xml;
    }

    /// <summary>
    /// Gets category specific sitemaps (core, locations, services, packages, blogs).
    /// </summary>
    public async Task<string> GetCategorySitemapXmlAsync(string category)
    {
        string cacheKey = $"Sitemap_Category_{category.ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out string? cachedXml) && !string.IsNullOrEmpty(cachedXml))
        {
            return cachedXml;
        }

        List<SitemapUrl> urls = category.ToLowerInvariant() switch
        {
            "core" => GetCoreUrls(),
            "locations" => GetLocationUrls(),
            "services" => GetServiceUrls(),
            "packages" => GetPackageUrls(),
            "blogs" => await GetBlogUrlsAsync(),
            _ => await GetAllUrlsAsync()
        };

        var xml = BuildSitemapUrlSetXml(urls);
        _cache.Set(cacheKey, xml, CacheDuration);
        return xml;
    }

    /// <summary>
    /// Gets the sitemap index XML file referencing category sub-sitemaps.
    /// </summary>
    public string GetSitemapIndexXml()
    {
        if (_cache.TryGetValue(IndexCacheKey, out string? cachedXml) && !string.IsNullOrEmpty(cachedXml))
        {
            return cachedXml;
        }

        var categories = new[] { "core", "locations", "services", "packages", "blogs" };
        var currentDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

        foreach (var cat in categories)
        {
            var sitemapUrl = $"{Domain}/sitemap-{cat}.xml";
            sb.AppendLine("  <sitemap>");
            sb.AppendLine($"    <loc>{EscapeXml(sitemapUrl)}</loc>");
            sb.AppendLine($"    <lastmod>{currentDate}</lastmod>");
            sb.AppendLine("  </sitemap>");
        }

        sb.AppendLine("</sitemapindex>");
        var xml = sb.ToString();

        _cache.Set(IndexCacheKey, xml, CacheDuration);
        return xml;
    }

    /// <summary>
    /// Invalidates all sitemap cache entries when new content is added or modified.
    /// </summary>
    public void InvalidateCache()
    {
        _cache.Remove(ConsolidatedCacheKey);
        _cache.Remove(IndexCacheKey);
        foreach (var cat in new[] { "core", "locations", "services", "packages", "blogs" })
        {
            _cache.Remove($"Sitemap_Category_{cat}");
        }
        _logger.LogInformation("Sitemap cache invalidated successfully.");
    }

    /// <summary>
    /// Notifies search engines (Google and Bing) that the sitemap has been updated.
    /// </summary>
    public async Task NotifySearchEnginesAsync()
    {
        InvalidateCache();
        var sitemapUrl = Uri.EscapeDataString($"{Domain}/sitemap.xml");

        var pingUrls = new[]
        {
            $"https://www.google.com/ping?sitemap={sitemapUrl}",
            $"https://www.bing.com/ping?sitemap={sitemapUrl}"
        };

        var client = _httpClientFactory.CreateClient("SitemapPingClient");
        client.Timeout = TimeSpan.FromSeconds(5);

        foreach (var pingUrl in pingUrls)
        {
            try
            {
                var response = await client.GetAsync(pingUrl);
                _logger.LogInformation("Pinged search engine sitemap endpoint {PingUrl}: StatusCode={StatusCode}", pingUrl, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to ping search engine sitemap endpoint {PingUrl}", pingUrl);
            }
        }
    }

    private async Task<List<SitemapUrl>> GetAllUrlsAsync()
    {
        var list = new List<SitemapUrl>();
        list.AddRange(GetCoreUrls());
        list.AddRange(GetLocationUrls());
        list.AddRange(GetServiceUrls());
        list.AddRange(GetPackageUrls());
        list.AddRange(await GetBlogUrlsAsync());
        return list;
    }

    private List<SitemapUrl> GetCoreUrls()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return new List<SitemapUrl>
        {
            new() { Loc = "/", ChangeFreq = "daily", Priority = 1.0, LastMod = today },
            new() { Loc = "/about", ChangeFreq = "monthly", Priority = 0.7, LastMod = today },
            new() { Loc = "/contact", ChangeFreq = "monthly", Priority = 0.7, LastMod = today },
            new() { Loc = "/insights", ChangeFreq = "daily", Priority = 0.8, LastMod = today },
            new() { Loc = "/locations", ChangeFreq = "weekly", Priority = 0.8, LastMod = today },
            new() { Loc = "/services", ChangeFreq = "weekly", Priority = 0.8, LastMod = today }
        };
    }

    private List<SitemapUrl> GetLocationUrls()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return new List<SitemapUrl>
        {
            new() { Loc = "/erode", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/locations/erode", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/tiruppur", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/locations/tiruppur", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/bhavani", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/perundurai", ChangeFreq = "weekly", Priority = 0.9, LastMod = today }
        };
    }

    private List<SitemapUrl> GetServiceUrls()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return new List<SitemapUrl>
        {
            new() { Loc = "/services/biochemistry", ChangeFreq = "monthly", Priority = 0.8, LastMod = today },
            new() { Loc = "/services/hematology", ChangeFreq = "monthly", Priority = 0.8, LastMod = today },
            new() { Loc = "/services/immunology", ChangeFreq = "monthly", Priority = 0.8, LastMod = today },
            new() { Loc = "/services/microbiology", ChangeFreq = "monthly", Priority = 0.8, LastMod = today },
            new() { Loc = "/services/pcr-molecular", ChangeFreq = "monthly", Priority = 0.8, LastMod = today },
            new() { Loc = "/services/home-sample-collection", ChangeFreq = "monthly", Priority = 0.8, LastMod = today }
        };
    }

    private List<SitemapUrl> GetPackageUrls()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return new List<SitemapUrl>
        {
            new() { Loc = "/packages/basic-health-checkup", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/packages/master-health-checkup", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/packages/executive-health-checkup", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/packages/well-women-health-checkup", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/packages/cardiac-package", ChangeFreq = "weekly", Priority = 0.9, LastMod = today },
            new() { Loc = "/packages/diabetic-package", ChangeFreq = "weekly", Priority = 0.9, LastMod = today }
        };
    }

    private async Task<List<SitemapUrl>> GetBlogUrlsAsync()
    {
        var list = new List<SitemapUrl>();
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var blogDbService = scope.ServiceProvider.GetRequiredService<BlogDbService>();
            var publishedBlogs = await blogDbService.GetBlogsAsync(publishedOnly: true);
            foreach (var blog in publishedBlogs)
            {
                string lastMod = DateTime.UtcNow.ToString("yyyy-MM-dd");
                if (DateTime.TryParse(blog.Date, out var parsedDate))
                {
                    lastMod = parsedDate.ToString("yyyy-MM-dd");
                }

                list.Add(new SitemapUrl
                {
                    Loc = $"/blog-details/{blog.Id}",
                    ChangeFreq = "weekly",
                    Priority = blog.IsFeatured ? 0.9 : 0.7,
                    LastMod = lastMod
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching published blog posts for sitemap generation.");
        }

        return list;
    }

    private string BuildSitemapUrlSetXml(IEnumerable<SitemapUrl> urls)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

        foreach (var item in urls)
        {
            var fullUrl = item.Loc.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                ? item.Loc
                : $"{Domain}{item.Loc}";

            sb.AppendLine("  <url>");
            sb.AppendLine($"    <loc>{EscapeXml(fullUrl)}</loc>");
            sb.AppendLine($"    <lastmod>{item.LastMod}</lastmod>");
            sb.AppendLine($"    <changefreq>{item.ChangeFreq}</changefreq>");
            sb.AppendLine($"    <priority>{item.Priority:F1}</priority>");
            sb.AppendLine("  </url>");
        }

        sb.AppendLine("</urlset>");
        return sb.ToString();
    }

    private static string EscapeXml(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;

        return input
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
    }
}
