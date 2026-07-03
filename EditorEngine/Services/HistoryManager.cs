using System.Collections.Generic;
using AlphaRazor.EditorEngine.Models;

namespace AlphaRazor.EditorEngine.Services;

public class HistoryState
{
    public ElementNode Document { get; set; } = null!;
    public SelectionState Selection { get; set; } = null!;
}

public class HistoryManager
{
    private readonly Stack<HistoryState> _undoStack = new();
    private readonly Stack<HistoryState> _redoStack = new();
    private const int MaxHistorySize = 100;

    public void Record(ElementNode document, SelectionState selection)
    {
        _redoStack.Clear();

        var state = new HistoryState
        {
            Document = document.Clone(),
            Selection = selection.Clone()
        };

        _undoStack.Push(state);
        if (_undoStack.Count > MaxHistorySize)
        {
            var temp = new Stack<HistoryState>();
            while (_undoStack.Count > MaxHistorySize)
            {
                temp.Push(_undoStack.Pop());
            }
            _undoStack.Clear();
            while (temp.Count > 0)
            {
                _undoStack.Push(temp.Pop());
            }
        }
    }

    public HistoryState? Undo(ElementNode currentDocument, SelectionState currentSelection)
    {
        if (_undoStack.Count == 0) return null;

        _redoStack.Push(new HistoryState
        {
            Document = currentDocument.Clone(),
            Selection = currentSelection.Clone()
        });

        return _undoStack.Pop();
    }

    public HistoryState? Redo(ElementNode currentDocument, SelectionState currentSelection)
    {
        if (_redoStack.Count == 0) return null;

        _undoStack.Push(new HistoryState
        {
            Document = currentDocument.Clone(),
            Selection = currentSelection.Clone()
        });

        return _redoStack.Pop();
    }

    public void Clear()
    {
        _undoStack.Clear();
        _redoStack.Clear();
    }
}
