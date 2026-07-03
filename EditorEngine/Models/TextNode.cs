using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AlphaRazor.EditorEngine.Models;

public class TextNode : AstNode
{
    public TextNode()
    {
        Type = "text";
    }

    public TextNode(string text) : this()
    {
        Text = text;
    }

    [JsonPropertyName("text")]
    public string Text { get; set; } = "";

    [JsonPropertyName("bold")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Bold { get; set; }

    [JsonPropertyName("italic")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Italic { get; set; }

    [JsonPropertyName("underline")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Underline { get; set; }

    [JsonPropertyName("strikethrough")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Strikethrough { get; set; }

    [JsonPropertyName("subscript")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Subscript { get; set; }

    [JsonPropertyName("superscript")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Superscript { get; set; }

    [JsonPropertyName("code")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Code { get; set; }

    [JsonPropertyName("color")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Color { get; set; }

    [JsonPropertyName("linkUrl")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? LinkUrl { get; set; }

    [JsonPropertyName("attributes")]
    public Dictionary<string, object> Attributes { get; set; } = new();

    public TextNode Clone()
    {
        return new TextNode
        {
            Id = Guid.NewGuid().ToString("N"),
            Text = this.Text,
            Bold = this.Bold,
            Italic = this.Italic,
            Underline = this.Underline,
            Strikethrough = this.Strikethrough,
            Subscript = this.Subscript,
            Superscript = this.Superscript,
            Code = this.Code,
            Color = this.Color,
            LinkUrl = this.LinkUrl,
            Attributes = new Dictionary<string, object>(this.Attributes)
        };
    }

    public bool HasSameFormatting(TextNode other)
    {
        if (other == null) return false;
        return Bold == other.Bold &&
               Italic == other.Italic &&
               Underline == other.Underline &&
               Strikethrough == other.Strikethrough &&
               Subscript == other.Subscript &&
               Superscript == other.Superscript &&
               Code == other.Code &&
               Color == other.Color &&
               LinkUrl == other.LinkUrl;
    }
}
