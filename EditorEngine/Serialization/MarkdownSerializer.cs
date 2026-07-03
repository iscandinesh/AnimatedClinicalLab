using System.Text;
using AlphaRazor.EditorEngine.Models;

namespace AlphaRazor.EditorEngine.Serialization;

public class MarkdownSerializer
{
    public string Serialize(ElementNode root)
    {
        var sb = new StringBuilder();
        foreach (var child in root.Children)
        {
            SerializeNode(child, sb);
        }
        return sb.ToString().TrimEnd();
    }

    private void SerializeNode(AstNode node, StringBuilder sb)
    {
        if (node is TextNode textNode)
        {
            var text = textNode.Text;
            if (string.IsNullOrEmpty(text)) return;

            var tagSb = new StringBuilder();
            
            bool hasLink = !string.IsNullOrEmpty(textNode.LinkUrl);
            if (hasLink) tagSb.Append("[");

            if (textNode.Bold) tagSb.Append("**");
            if (textNode.Italic) tagSb.Append("*");
            if (textNode.Strikethrough) tagSb.Append("~~");
            if (textNode.Superscript) tagSb.Append("<sup>");
            if (textNode.Subscript) tagSb.Append("<sub>");
            if (textNode.Code) tagSb.Append("`");

            tagSb.Append(text);

            if (textNode.Code) tagSb.Append("`");
            if (textNode.Subscript) tagSb.Append("</sub>");
            if (textNode.Superscript) tagSb.Append("</sup>");
            if (textNode.Strikethrough) tagSb.Append("~~");
            if (textNode.Italic) tagSb.Append("*");
            if (textNode.Bold) tagSb.Append("**");

            if (hasLink) tagSb.Append($"]({textNode.LinkUrl})");

            sb.Append(tagSb.ToString());
        }
        else if (node is ElementNode elementNode)
        {
            switch (elementNode.Type)
            {
                case "paragraph":
                    SerializeChildren(elementNode, sb);
                    sb.Append("\n\n");
                    break;
                case "heading":
                    int level = elementNode.Level ?? 1;
                    sb.Append(new string('#', level) + " ");
                    SerializeChildren(elementNode, sb);
                    sb.Append("\n\n");
                    break;
                case "blockquote":
                    sb.Append("> ");
                    var bqSb = new StringBuilder();
                    SerializeChildren(elementNode, bqSb);
                    sb.Append(bqSb.ToString().Replace("\n", "\n> "));
                    sb.Append("\n\n");
                    break;
                case "code-block":
                    sb.Append("```\n");
                    SerializeChildren(elementNode, sb);
                    sb.Append("\n```\n\n");
                    break;
                case "list":
                    bool isOrdered = elementNode.Format == "ordered";
                    bool isTask = elementNode.Format == "task";
                    for (int i = 0; i < elementNode.Children.Count; i++)
                    {
                        var li = elementNode.Children[i] as ElementNode;
                        if (li != null)
                        {
                            string prefix;
                            if (isTask)
                            {
                                bool isChecked = false;
                                if (li.Attributes.TryGetValue("checked", out var chkVal))
                                {
                                    if (chkVal is bool b) isChecked = b;
                                    else if (chkVal is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.True) isChecked = true;
                                }
                                prefix = isChecked ? "- [x] " : "- [ ] ";
                            }
                            else
                            {
                                prefix = isOrdered ? $"{i + 1}. " : "- ";
                            }
                            sb.Append(prefix);
                            var liSb = new StringBuilder();
                            SerializeChildren(li, liSb);
                            sb.Append(liSb.ToString().TrimEnd());
                            sb.Append("\n");
                        }
                    }
                    sb.Append("\n");
                    break;
                case "image":
                    string? width = null;
                    if (elementNode.Attributes.TryGetValue("width", out var wVal))
                    {
                        width = wVal?.ToString();
                    }
                    string? alignment = null;
                    if (elementNode.Attributes.TryGetValue("alignment", out var aVal))
                    {
                        alignment = aVal?.ToString();
                    }

                    if (!string.IsNullOrEmpty(width) || !string.IsNullOrEmpty(alignment))
                    {
                        var styleSb = new StringBuilder();
                        if (!string.IsNullOrEmpty(width))
                        {
                            styleSb.Append($"width: {width}; max-width: 100%; height: auto;");
                        }
                        if (!string.IsNullOrEmpty(alignment))
                        {
                            string margin = "1rem 0";
                            string floatStyle = "none";
                            string display = "block";
                            if (alignment == "center")
                            {
                                margin = "1rem auto";
                            }
                            else if (alignment == "left")
                            {
                                margin = "1rem auto 1rem 0";
                                floatStyle = "left";
                                display = "inline-block";
                            }
                            else if (alignment == "right")
                            {
                                margin = "1rem 0 1rem auto";
                                floatStyle = "right";
                                display = "inline-block";
                            }
                            styleSb.Append($" display: {display}; margin: {margin}; float: {floatStyle};");
                        }
                        sb.Append($"<img src=\"{elementNode.Url}\" alt=\"{elementNode.Alt}\" style=\"{styleSb.ToString().Trim()}\" />\n\n");
                    }
                    else
                    {
                        sb.Append($"![{elementNode.Alt}]({elementNode.Url})\n\n");
                    }
                    break;
                case "table":
                    var rows = elementNode.Children;
                    if (rows.Count > 0)
                    {
                        for (int r = 0; r < rows.Count; r++)
                        {
                            if (rows[r] is ElementNode row)
                            {
                                sb.Append("| ");
                                foreach (var cell in row.Children)
                                {
                                    if (cell is ElementNode cellEl)
                                    {
                                        var cellSb = new StringBuilder();
                                        SerializeChildren(cellEl, cellSb);
                                        sb.Append(cellSb.ToString().Trim().Replace("\n", " ") + " | ");
                                    }
                                }
                                sb.Append("\n");

                                if (r == 0)
                                {
                                    sb.Append("|");
                                    foreach (var cell in row.Children)
                                    {
                                        sb.Append(" --- |");
                                    }
                                    sb.Append("\n");
                                }
                            }
                        }
                        sb.Append("\n");
                    }
                    break;
                case "video":
                    sb.Append($"@[video]({elementNode.Url})\n\n");
                    break;
                case "page-break":
                    sb.Append("<!-- page-break -->\n\n");
                    break;
                case "horizontal-rule":
                    sb.Append("---\n\n");
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
}
