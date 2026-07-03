using System;
using System.Text.Json.Serialization;

namespace AlphaRazor.EditorEngine.Models;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(ElementNode), "element")]
[JsonDerivedType(typeof(TextNode), "text")]
public abstract class AstNode
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [JsonPropertyName("type")]
    public string Type { get; set; } = "";
}
