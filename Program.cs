using System.Text;
using AlphaRazor.Components;
using AlphaRazor.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("SitemapPingClient");
builder.Services.AddScoped<ThemeService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<BlogDbService>();
builder.Services.AddSingleton<SitemapService>();

var app = builder.Build();

// Initialize database tables and seed if empty
using (var scope = app.Services.CreateScope())
{
    var dbService = scope.ServiceProvider.GetRequiredService<BlogDbService>();
    await dbService.InitializeDatabaseAsync();

    var sitemapService = scope.ServiceProvider.GetRequiredService<SitemapService>();
    dbService.OnBlogChanged += async () =>
    {
        await sitemapService.NotifySearchEnginesAsync();
    };
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

var uploadsPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "text_editor", "Text_editor", "wwwroot", "uploads"));
if (Directory.Exists(uploadsPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads"
    });
}

// Dynamic Sitemap Routes
app.MapGet("/sitemap.xml", async (SitemapService sitemapService) =>
    Results.Text(await sitemapService.GetConsolidatedSitemapXmlAsync(), "application/xml", Encoding.UTF8));

app.MapGet("/sitemap-index.xml", (SitemapService sitemapService) =>
    Results.Text(sitemapService.GetSitemapIndexXml(), "application/xml", Encoding.UTF8));

app.MapGet("/sitemap-{category}.xml", async (string category, SitemapService sitemapService) =>
    Results.Text(await sitemapService.GetCategorySitemapXmlAsync(category), "application/xml", Encoding.UTF8));

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
