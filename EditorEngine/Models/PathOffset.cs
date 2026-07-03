using System;
using System.Linq;
using System.Text.Json.Serialization;

namespace AlphaRazor.EditorEngine.Models;

public class PathOffset
{
    [JsonPropertyName("path")]
    public int[] Path { get; set; } = Array.Empty<int>();

    [JsonPropertyName("offset")]
    public int Offset { get; set; }

    public PathOffset Clone()
    {
        return new PathOffset
        {
            Path = Path.ToArray(),
            Offset = Offset
        };
    }
}
