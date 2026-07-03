using System;
using System.Linq;
using System.Text.Json.Serialization;

namespace AlphaRazor.EditorEngine.Models;

public class SelectionState
{
    [JsonPropertyName("anchor")]
    public PathOffset? Anchor { get; set; }

    [JsonPropertyName("focus")]
    public PathOffset? Focus { get; set; }

    [JsonIgnore]
    public bool IsCollapsed => Anchor != null && Focus != null &&
                               Anchor.Path.SequenceEqual(Focus.Path) &&
                               Anchor.Offset == Focus.Offset;

    public SelectionState Clone()
    {
        return new SelectionState
        {
            Anchor = Anchor?.Clone(),
            Focus = Focus?.Clone()
        };
    }

    public static int ComparePaths(int[] path1, int[] path2)
    {
        int len = Math.Min(path1.Length, path2.Length);
        for (int i = 0; i < len; i++)
        {
            if (path1[i] < path2[i]) return -1;
            if (path1[i] > path2[i]) return 1;
        }
        return path1.Length.CompareTo(path2.Length);
    }

    /// <summary>
    /// Returns the normalized selection where Anchor <= Focus.
    /// </summary>
    public (PathOffset Start, PathOffset End) GetNormalizedSelection()
    {
        if (Anchor == null || Focus == null)
            return (new PathOffset(), new PathOffset());

        int cmp = ComparePaths(Anchor.Path, Focus.Path);
        if (cmp < 0 || (cmp == 0 && Anchor.Offset <= Focus.Offset))
        {
            return (Anchor, Focus);
        }
        else
        {
            return (Focus, Anchor);
        }
    }
}
