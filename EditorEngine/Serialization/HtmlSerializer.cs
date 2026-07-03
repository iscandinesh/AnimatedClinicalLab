using System.Text;
using AlphaRazor.EditorEngine.Models;

namespace AlphaRazor.EditorEngine.Serialization;

public class HtmlSerializer
{
    public string Serialize(ElementNode root)
    {
        var sb = new StringBuilder();
        foreach (var child in root.Children)
        {
            SerializeNode(child, sb);
        }
        return sb.ToString();
    }

    private void SerializeNode(AstNode node, StringBuilder sb)
    {
        if (node is TextNode textNode)
        {
            var tagSb = new StringBuilder();
            
            bool hasLink = !string.IsNullOrEmpty(textNode.LinkUrl);
            bool hasColor = !string.IsNullOrEmpty(textNode.Color);

            if (hasLink) tagSb.Append($"<a href=\"{textNode.LinkUrl}\" target=\"_blank\">");
            if (hasColor) tagSb.Append($"<span style=\"color: {textNode.Color};\">");
            if (textNode.Bold) tagSb.Append("<strong>");
            if (textNode.Italic) tagSb.Append("<em>");
            if (textNode.Underline) tagSb.Append("<u>");
            if (textNode.Strikethrough) tagSb.Append("<s>");
            if (textNode.Subscript) tagSb.Append("<sub>");
            if (textNode.Superscript) tagSb.Append("<sup>");
            if (textNode.Code) tagSb.Append("<code>");

            tagSb.Append(System.Net.WebUtility.HtmlEncode(textNode.Text));

            if (textNode.Code) tagSb.Append("</code>");
            if (textNode.Superscript) tagSb.Append("</sup>");
            if (textNode.Subscript) tagSb.Append("</sub>");
            if (textNode.Strikethrough) tagSb.Append("</s>");
            if (textNode.Underline) tagSb.Append("</u>");
            if (textNode.Italic) tagSb.Append("</em>");
            if (textNode.Bold) tagSb.Append("</strong>");
            if (hasColor) tagSb.Append("</span>");
            if (hasLink) tagSb.Append("</a>");

            sb.Append(tagSb.ToString());
        }
        else if (node is ElementNode elementNode)
        {
            switch (elementNode.Type)
            {
                case "paragraph":
                case "heading":
                case "blockquote":
                    sb.Append(GetBlockStartTag(elementNode));
                    SerializeChildren(elementNode, sb);
                    sb.Append(GetBlockEndTag(elementNode));
                    break;
                case "code-block":
                    sb.Append("<pre><code>");
                    SerializeChildren(elementNode, sb);
                    sb.Append("</code></pre>");
                    break;
                case "list":
                    string listTag = elementNode.Format == "ordered" ? "ol" : "ul";
                    sb.Append($"<{listTag}>");
                    SerializeChildren(elementNode, sb);
                    sb.Append($"</{listTag}>");
                    break;
                case "list-item":
                    sb.Append("<li>");
                    SerializeChildren(elementNode, sb);
                    sb.Append("</li>");
                    break;
                case "image":
                    string imgWidth = "100%";
                    if (elementNode.Attributes.TryGetValue("width", out var wVal) && wVal != null)
                    {
                        imgWidth = wVal.ToString();
                    }
                    string imgAlign = "center";
                    if (elementNode.Attributes.TryGetValue("alignment", out var aVal) && aVal != null)
                    {
                        imgAlign = aVal.ToString();
                    }
                    string imgStyle = $"display: block; margin: 1rem auto; width: {imgWidth}; max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #cbd5e1;";
                    if (imgAlign == "left")
                    {
                        imgStyle = $"display: inline-block; margin: 1rem auto 1rem 0; float: left; width: {imgWidth}; max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #cbd5e1;";
                    }
                    else if (imgAlign == "right")
                    {
                        imgStyle = $"display: inline-block; margin: 1rem 0 1rem auto; float: right; width: {imgWidth}; max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #cbd5e1;";
                    }
                    sb.Append($"<img src=\"{elementNode.Url}\" alt=\"{elementNode.Alt}\" style=\"{imgStyle}\" data-alignment=\"{imgAlign}\" width=\"{imgWidth}\" />");
                    break;
                case "table":
                    string borderColor = "#cbd5e1";
                    if (elementNode.Attributes.TryGetValue("borderColor", out var bcVal) && bcVal != null)
                    {
                        borderColor = bcVal.ToString();
                    }
                    string borderStyle = "solid";
                    if (elementNode.Attributes.TryGetValue("borderStyle", out var bsVal) && bsVal != null)
                    {
                        borderStyle = bsVal.ToString();
                    }
                    string borderWidth = "2px";
                    if (elementNode.Attributes.TryGetValue("borderWidth", out var bwVal) && bwVal != null)
                    {
                        borderWidth = bwVal.ToString();
                    }
                    string alignment = "center";
                    if (elementNode.Attributes.TryGetValue("alignment", out var alignVal) && alignVal != null)
                    {
                        alignment = alignVal.ToString();
                    }
                    sb.Append($"<table class=\"table-align-{alignment}\" style=\"--table-border-color: {borderColor}; --table-border-style: {borderStyle}; --table-border-width: {borderWidth}; border-color: {borderColor}; border-style: {borderStyle}; border-width: {borderWidth};\" data-border-color=\"{borderColor}\" data-border-style=\"{borderStyle}\" data-border-width=\"{borderWidth}\" data-alignment=\"{alignment}\"><tbody>");
                    SerializeChildren(elementNode, sb);
                    sb.Append("</tbody></table>");
                    break;
                case "table-row":
                    sb.Append("<tr>");
                    SerializeChildren(elementNode, sb);
                    sb.Append("</tr>");
                    break;
                case "table-cell":
                case "table-header":
                    string cellTag = elementNode.Type == "table-header" ? "th" : "td";
                    string cellStyle = cellTag == "th" 
                        ? "border: var(--table-border-width, 2px) var(--table-border-style, solid) var(--table-border-color, #cbd5e1); font-weight: 700; background-color: #f1f5f9;"
                        : "border: var(--table-border-width, 2px) var(--table-border-style, solid) var(--table-border-color, #cbd5e1);";
                    
                    if (elementNode.Attributes.TryGetValue("backgroundColor", out var cellBgVal) && cellBgVal != null)
                    {
                        if (cellTag == "th") {
                            cellStyle = cellStyle.Replace("background-color: #f1f5f9;", $"background-color: {cellBgVal};");
                        } else {
                            cellStyle += $" background-color: {cellBgVal};";
                        }
                    }
                    if (elementNode.Attributes.TryGetValue("padding", out var cellPadVal) && cellPadVal != null)
                    {
                        cellStyle += $" padding: {cellPadVal};";
                    }
                    else
                    {
                        cellStyle += " padding: 12px 16px;";
                    }
                    string colspanAttr = "";
                    if (elementNode.Attributes.TryGetValue("colspan", out var csVal) && csVal != null)
                    {
                        colspanAttr = $" colspan=\"{csVal}\"";
                    }
                    string rowspanAttr = "";
                    if (elementNode.Attributes.TryGetValue("rowspan", out var rsVal) && rsVal != null)
                    {
                        rowspanAttr = $" rowspan=\"{rsVal}\"";
                    }
                    sb.Append($"<{cellTag}{colspanAttr}{rowspanAttr} style=\"{cellStyle}\">");
                    SerializeChildren(elementNode, sb);
                    sb.Append($"</{cellTag}>");
                    break;
                case "page-break":
                case "pageBreak":
                    sb.Append("<div class=\"page-break\" style=\"border-top: 2px dashed #3b82f6; margin: 2rem 0; position: relative; text-align: center; page-break-after: always; height: 0;\">" +
                              "<span style=\"position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #ffffff; padding: 0 10px; font-size: 0.75rem; color: #3b82f6; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;\">Page Break</span>" +
                              "</div>");
                    break;
                case "video":
                    string vUrl = elementNode.Url ?? "";
                    if (vUrl.Contains("youtube.com") || vUrl.Contains("youtu.be") || vUrl.Contains("vimeo.com") || vUrl.Contains("player.vimeo.com"))
                    {
                        string embedUrl = vUrl;
                        if (vUrl.Contains("youtube.com/watch?v="))
                        {
                            var videoId = vUrl.Split("v=")[1].Split('&')[0];
                            embedUrl = $"https://www.youtube.com/embed/{videoId}";
                        }
                        else if (vUrl.Contains("youtu.be/"))
                        {
                            var videoId = vUrl.Split("youtu.be/")[1].Split('?')[0];
                            embedUrl = $"https://www.youtube.com/embed/{videoId}";
                        }
                        sb.Append($"<div class=\"video-wrapper\" style=\"position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1.5rem 0;\"><iframe src=\"{embedUrl}\" width=\"100%\" style=\"position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;\" allowfullscreen=\"true\" frameborder=\"0\"></iframe></div>");
                    }
                    else
                    {
                        sb.Append($"<video src=\"{vUrl}\" controls=\"true\" style=\"max-width: 100%; margin: 1.5rem 0; display: block; border-radius: 8px;\" width=\"100%\"></video>");
                    }
                    break;
                case "horizontal-rule":
                case "horizontal-rules":
                    sb.Append("<hr />");
                    break;
            }
        }
    }

    private void SerializeChildren(ElementNode elementNode, StringBuilder sb)
    {
        foreach (var child in elementNode.Children)
        {
            SerializeNode(child, sb);
        }
    }

    private string GetBlockStartTag(ElementNode el)
    {
        string? baseTag = el.Type switch
        {
            "paragraph" => "p",
            "heading" => $"h{el.Level ?? 1}",
            "blockquote" => "blockquote",
            _ => null
        };

        if (baseTag == null) return "";

        if (!string.IsNullOrEmpty(el.Align))
        {
            return $"<{baseTag} style=\"text-align: {el.Align};\">";
        }
        return $"<{baseTag}>";
    }

    private string GetBlockEndTag(ElementNode el)
    {
        return el.Type switch
        {
            "paragraph" => "</p>",
            "heading" => $"</h{el.Level ?? 1}>",
            "blockquote" => "</blockquote>",
            _ => ""
        };
    }
}
