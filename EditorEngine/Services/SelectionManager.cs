using System;
using System.Threading.Tasks;
using Microsoft.JSInterop;
using AlphaRazor.EditorEngine.Models;

namespace AlphaRazor.EditorEngine.Services;

public class SelectionManager
{
    private readonly IJSRuntime _jsRuntime;
    private readonly EditorState _editorState;

    public SelectionManager(IJSRuntime jsRuntime, EditorState editorState)
    {
        _jsRuntime = jsRuntime;
        _editorState = editorState;
    }

    /// <summary>
    /// Synchronizes the DOM selection back into the EditorState's C# coordinates.
    /// </summary>
    public async Task SyncFromDOMAsync()
    {
        try
        {
            var browserSel = await _jsRuntime.InvokeAsync<BrowserSelection>("editorInterop.getSelection");
            if (browserSel != null && browserSel.AnchorNodeId != null && browserSel.FocusNodeId != null)
            {
                var anchorPath = _editorState.FindPathById(browserSel.AnchorNodeId);
                var focusPath = _editorState.FindPathById(browserSel.FocusNodeId);

                if (anchorPath != null && focusPath != null)
                {
                    _editorState.Selection.Anchor = new PathOffset
                    {
                        Path = anchorPath,
                        Offset = browserSel.AnchorOffset
                    };
                    _editorState.Selection.Focus = new PathOffset
                    {
                        Path = focusPath,
                        Offset = browserSel.FocusOffset
                    };
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Selection sync error: {ex.Message}");
        }
    }

    /// <summary>
    /// Pushes the C# EditorState selection coordinates down to the browser DOM.
    /// </summary>
    public async Task SyncToDOMAsync()
    {
        var sel = _editorState.Selection;
        if (sel?.Anchor == null || sel?.Focus == null) return;

        var anchorNode = _editorState.GetNodeByPath(sel.Anchor.Path);
        var focusNode = _editorState.GetNodeByPath(sel.Focus.Path);

        if (anchorNode != null && focusNode != null)
        {
            try
            {
                await _jsRuntime.InvokeVoidAsync("editorInterop.setSelection",
                    anchorNode.Id, sel.Anchor.Offset,
                    focusNode.Id, sel.Focus.Offset);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Selection set error: {ex.Message}");
            }
        }
    }

    private class BrowserSelection
    {
        public string? AnchorNodeId { get; set; }
        public int AnchorOffset { get; set; }
        public string? FocusNodeId { get; set; }
        public int FocusOffset { get; set; }
    }
}
