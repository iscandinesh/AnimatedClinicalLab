using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AlphaRazor.EditorEngine.Models;

public class ElementNode : AstNode
{
    public ElementNode()
    {
        // Default constructor
    }

    public ElementNode(string type)
    {
        Type = type;
    }

    [JsonPropertyName("children")]
    public List<AstNode> Children { get; set; } = new();

    [JsonPropertyName("attributes")]
    public Dictionary<string, object> Attributes { get; set; } = new();

    [JsonIgnore]
    public int? Level
    {
        get
        {
            if (Attributes.TryGetValue("level", out var val))
            {
                if (val is int l) return l;
                if (val is System.Text.Json.JsonElement je && je.TryGetInt32(out var parsedL)) return parsedL;
            }
            return null;
        }
        set
        {
            if (value.HasValue) Attributes["level"] = value.Value;
            else Attributes.Remove("level");
        }
    }

    [JsonIgnore]
    public string? Format
    {
        get => Attributes.TryGetValue("format", out var val) && val is string s ? s : null;
        set
        {
            if (value != null) Attributes["format"] = value;
            else Attributes.Remove("format");
        }
    }

    [JsonIgnore]
    public string? Url
    {
        get => Attributes.TryGetValue("url", out var val) && val is string s ? s : null;
        set
        {
            if (value != null) Attributes["url"] = value;
            else Attributes.Remove("url");
        }
    }

    [JsonIgnore]
    public string? Alt
    {
        get => Attributes.TryGetValue("alt", out var val) && val is string s ? s : null;
        set
        {
            if (value != null) Attributes["alt"] = value;
            else Attributes.Remove("alt");
        }
    }

    [JsonIgnore]
    public string? Align
    {
        get => Attributes.TryGetValue("align", out var val) && val is string s ? s : null;
        set
        {
            if (value != null) Attributes["align"] = value;
            else Attributes.Remove("align");
        }
    }

    public ElementNode Clone()
    {
        var clone = new ElementNode
        {
            Id = Guid.NewGuid().ToString("N"),
            Type = this.Type,
            Attributes = new Dictionary<string, object>(this.Attributes)
        };

        foreach (var child in Children)
        {
            if (child is ElementNode el)
                clone.Children.Add(el.Clone());
            else if (child is TextNode tx)
                clone.Children.Add(tx.Clone());
        }

        return clone;
    }
}
