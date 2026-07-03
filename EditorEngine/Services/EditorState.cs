using System;
using System.Collections.Generic;
using System.Linq;
using AlphaRazor.EditorEngine.Models;

namespace AlphaRazor.EditorEngine.Services;

public class EditorState
{
    public ElementNode Document { get; private set; } = null!;
    public SelectionState Selection { get; set; } = new();
    
    private readonly HistoryManager _history = new();
    private readonly HashSet<string> _pendingFormats = new(StringComparer.OrdinalIgnoreCase);
    private string? _pendingColor;

    public event Action? OnChange;

    public EditorState()
    {
        InitializeEmptyDocument();
    }

    public void InitializeEmptyDocument()
    {
        Document = new ElementNode("root");
        var paragraph = new ElementNode("paragraph");
        var emptyText = new TextNode("");
        paragraph.Children.Add(emptyText);
        Document.Children.Add(paragraph);
        
        Selection = new SelectionState
        {
            Anchor = new PathOffset { Path = new[] { 0, 0 }, Offset = 0 },
            Focus = new PathOffset { Path = new[] { 0, 0 }, Offset = 0 }
        };
        _pendingFormats.Clear();
        _pendingColor = null;
        _history.Clear();
        NotifyStateChanged();
    }

    public void SetDocument(ElementNode doc, SelectionState? sel = null)
    {
        Document = doc ?? throw new ArgumentNullException(nameof(doc));
        if (sel != null)
        {
            Selection = sel;
        }
        else
        {
            // Position selection at first text node
            var firstTextPath = FindFirstTextNodePath(Document, new List<int>());
            if (firstTextPath != null)
            {
                Selection = new SelectionState
                {
                    Anchor = new PathOffset { Path = firstTextPath, Offset = 0 },
                    Focus = new PathOffset { Path = firstTextPath, Offset = 0 }
                };
            }
        }
        ClearPendingFormats();
        Normalize();
        NotifyStateChanged();
    }

    private int[]? FindFirstTextNodePath(AstNode node, List<int> currentPath)
    {
        if (node is TextNode)
        {
            return currentPath.ToArray();
        }
        if (node is ElementNode el)
        {
            for (int i = 0; i < el.Children.Count; i++)
            {
                currentPath.Add(i);
                var path = FindFirstTextNodePath(el.Children[i], currentPath);
                if (path != null) return path;
                currentPath.RemoveAt(currentPath.Count - 1);
            }
        }
        return null;
    }

    public void NotifyStateChanged()
    {
        OnChange?.Invoke();
    }

    // --- History Management ---
    public void RecordHistory()
    {
        _history.Record(Document, Selection);
    }

    public bool Undo()
    {
        var prevState = _history.Undo(Document, Selection);
        if (prevState != null)
        {
            Document = prevState.Document;
            Selection = prevState.Selection;
            ClearPendingFormats();
            NotifyStateChanged();
            return true;
        }
        return false;
    }

    public bool Redo()
    {
        var nextState = _history.Redo(Document, Selection);
        if (nextState != null)
        {
            Document = nextState.Document;
            Selection = nextState.Selection;
            ClearPendingFormats();
            NotifyStateChanged();
            return true;
        }
        return false;
    }

    // --- Pending Format Handling ---
    public void TogglePendingFormat(string formatName)
    {
        if (_pendingFormats.Contains(formatName))
        {
            _pendingFormats.Remove(formatName);
        }
        else
        {
            _pendingFormats.Add(formatName);
            if (formatName.Equals("subscript", StringComparison.OrdinalIgnoreCase))
            {
                _pendingFormats.Remove("superscript");
            }
            else if (formatName.Equals("superscript", StringComparison.OrdinalIgnoreCase))
            {
                _pendingFormats.Remove("subscript");
            }
        }
    }

    public void SetPendingColor(string? color)
    {
        _pendingColor = color;
    }

    public bool IsPendingFormatActive(string format)
    {
        return _pendingFormats.Contains(format);
    }

    public string? GetPendingColor() => _pendingColor;

    public void ClearPendingFormats()
    {
        _pendingFormats.Clear();
        _pendingColor = null;
    }

    // --- Text Input Mutation Commands ---
    public void InsertText(string text)
    {
        RecordHistory();

        if (Selection.Anchor == null || Selection.Focus == null) return;

        if (!Selection.IsCollapsed)
        {
            DeleteSelectionInternal();
        }

        var path = Selection.Anchor.Path;
        var offset = Selection.Anchor.Offset;

        var node = GetNodeByPath(path) as TextNode;
        if (node == null) return;

        if (_pendingFormats.Count > 0 || _pendingColor != null)
        {
            // If offset is in the middle, split
            if (offset > 0 && offset < node.Text.Length)
            {
                var splitResult = SplitTextNodeAt(path, offset);
                if (splitResult.RightId != null)
                {
                    var rightPath = FindPathById(splitResult.RightId)!;
                    node = (TextNode)GetNodeByPath(rightPath)!;
                    path = rightPath;
                    offset = 0;
                }
            }

            var newNode = new TextNode(text)
            {
                Bold = _pendingFormats.Contains("bold"),
                Italic = _pendingFormats.Contains("italic"),
                Underline = _pendingFormats.Contains("underline"),
                Strikethrough = _pendingFormats.Contains("strikethrough"),
                Subscript = _pendingFormats.Contains("subscript"),
                Superscript = _pendingFormats.Contains("superscript"),
                Color = _pendingColor
            };

            var parentPath = path.Take(path.Length - 1).ToArray();
            var parent = GetNodeByPath(parentPath) as ElementNode;
            if (parent != null)
            {
                int idx = path[^1];
                if (offset == 0)
                {
                    parent.Children.Insert(idx, newNode);
                    path = parentPath.Concat(new[] { idx }).ToArray();
                }
                else
                {
                    parent.Children.Insert(idx + 1, newNode);
                    path = parentPath.Concat(new[] { idx + 1 }).ToArray();
                }
                node = newNode;
                offset = text.Length;
            }
            ClearPendingFormats();
        }
        else
        {
            node.Text = node.Text.Insert(offset, text);
            offset += text.Length;
        }

        Selection.Anchor.Path = path;
        Selection.Anchor.Offset = offset;
        Selection.Focus = Selection.Anchor.Clone();

        Normalize();
        NotifyStateChanged();
    }

    public void DeleteBackward()
    {
        RecordHistory();

        if (Selection.Anchor == null || Selection.Focus == null) return;

        if (!Selection.IsCollapsed)
        {
            DeleteSelectionInternal();
            Normalize();
            NotifyStateChanged();
            return;
        }

        var path = Selection.Anchor.Path;
        var offset = Selection.Anchor.Offset;

        var node = GetNodeByPath(path) as TextNode;
        if (node == null) return;

        if (offset > 0)
        {
            node.Text = node.Text.Remove(offset - 1, 1);
            Selection.Anchor.Offset = offset - 1;
            Selection.Focus = Selection.Anchor.Clone();
        }
        else
        {
            int childIndex = path[^1];
            if (childIndex > 0)
            {
                var prevPath = path.Take(path.Length - 1).Concat(new[] { childIndex - 1 }).ToArray();
                var prevNode = GetNodeByPath(prevPath) as TextNode;
                if (prevNode != null)
                {
                    if (prevNode.Text.Length > 0)
                    {
                        prevNode.Text = prevNode.Text.Remove(prevNode.Text.Length - 1, 1);
                    }
                    Selection.Anchor.Path = prevPath;
                    Selection.Anchor.Offset = prevNode.Text.Length;
                    Selection.Focus = Selection.Anchor.Clone();
                }
            }
            else
            {
                var currentBlockPath = path.Take(1).ToArray();
                int currentBlockIdx = currentBlockPath[0];
                if (currentBlockIdx > 0)
                {
                    var parent = Document;
                    var currentBlock = parent.Children[currentBlockIdx] as ElementNode;
                    var prevBlock = parent.Children[currentBlockIdx - 1] as ElementNode;

                    if (currentBlock != null && prevBlock != null)
                    {
                        int lastChildIdx = prevBlock.Children.Count - 1;
                        var lastChild = prevBlock.Children[lastChildIdx] as TextNode;
                        int targetOffset = lastChild != null ? lastChild.Text.Length : 0;

                        foreach (var child in currentBlock.Children)
                        {
                            prevBlock.Children.Add(child);
                        }

                        parent.Children.RemoveAt(currentBlockIdx);

                        if (lastChild != null)
                        {
                            var newPath = FindPathById(lastChild.Id);
                            if (newPath != null)
                            {
                                Selection.Anchor.Path = newPath;
                                Selection.Anchor.Offset = targetOffset;
                                Selection.Focus = Selection.Anchor.Clone();
                            }
                        }
                    }
                }
            }
        }

        Normalize();
        NotifyStateChanged();
    }

    public void InsertBreak()
    {
        RecordHistory();

        if (Selection.Anchor == null || Selection.Focus == null) return;

        if (!Selection.IsCollapsed)
        {
            DeleteSelectionInternal();
        }

        var path = Selection.Anchor.Path;
        var offset = Selection.Anchor.Offset;

        var currentBlockPath = path.Take(1).ToArray();
        int currentBlockIdx = currentBlockPath[0];
        var currentBlock = Document.Children[currentBlockIdx] as ElementNode;
        if (currentBlock == null) return;

        var textNodeIdx = path[1];
        var textNode = currentBlock.Children[textNodeIdx] as TextNode;
        if (textNode == null) return;

        var leftText = textNode.Text.Substring(0, offset);
        var rightText = textNode.Text.Substring(offset);

        textNode.Text = leftText;

        string nextBlockType = currentBlock.Type == "heading" ? "paragraph" : currentBlock.Type;
        var newBlock = new ElementNode(nextBlockType);

        var firstNewTextNode = textNode.Clone();
        firstNewTextNode.Text = rightText;
        newBlock.Children.Add(firstNewTextNode);

        for (int i = textNodeIdx + 1; i < currentBlock.Children.Count; i++)
        {
            newBlock.Children.Add(currentBlock.Children[i]);
        }
        if (currentBlock.Children.Count > textNodeIdx + 1)
        {
            currentBlock.Children.RemoveRange(textNodeIdx + 1, currentBlock.Children.Count - (textNodeIdx + 1));
        }

        Document.Children.Insert(currentBlockIdx + 1, newBlock);

        Selection.Anchor = new PathOffset { Path = new int[] { currentBlockIdx + 1, 0 }, Offset = 0 };
        Selection.Focus = Selection.Anchor.Clone();

        Normalize();
        NotifyStateChanged();
    }

    // --- Private Helper Mutation Routines ---
    private void DeleteSelectionInternal()
    {
        if (Selection.Anchor == null || Selection.Focus == null) return;
        if (Selection.IsCollapsed) return;

        var (start, end) = Selection.GetNormalizedSelection();
        string startNodeId = GetTextNodeAt(start.Path).Id;
        string endNodeId = GetTextNodeAt(end.Path).Id;

        bool sameNode = startNodeId == endNodeId;

        var startSplit = SplitTextNodeAt(start.Path, start.Offset);
        if (startSplit.RightId != null)
        {
            startNodeId = startSplit.RightId;
            start.Path = FindPathById(startNodeId)!;
            
            if (sameNode)
            {
                endNodeId = startNodeId;
                end.Offset -= start.Offset;
            }
            start.Offset = 0;
        }

        var endPath = FindPathById(endNodeId)!;
        var endSplit = SplitTextNodeAt(endPath, end.Offset);
        if (endSplit.LeftId != null)
        {
            endNodeId = endSplit.LeftId;
            var endNodePath = FindPathById(endNodeId)!;
            var endNode = (TextNode)GetNodeByPath(endNodePath)!;
            end.Path = endNodePath;
            end.Offset = endNode.Text.Length;
        }

        var textNodes = GetTextNodesInRange(startNodeId, endNodeId);
        foreach (var node in textNodes)
        {
            var nodePath = FindPathById(node.Id);
            if (nodePath == null) continue;

            var parentPath = nodePath.Take(nodePath.Length - 1).ToArray();
            var parent = GetNodeByPath(parentPath) as ElementNode;
            if (parent != null)
            {
                parent.Children.Remove(node);
            }
        }

        Selection.Anchor = start;
        Selection.Focus = start.Clone();
    }

    public (string? LeftId, string? RightId) SplitTextNodeAt(int[] path, int offset)
    {
        var node = GetNodeByPath(path) as TextNode;
        if (node == null || offset <= 0 || offset >= node.Text.Length)
        {
            return (null, null);
        }

        var parentPath = path.Take(path.Length - 1).ToArray();
        var parent = GetNodeByPath(parentPath) as ElementNode;
        if (parent == null) return (null, null);

        int childIndex = path[^1];

        var leftText = node.Text.Substring(0, offset);
        var rightText = node.Text.Substring(offset);

        var leftNode = node.Clone();
        leftNode.Text = leftText;
        leftNode.Id = node.Id;

        var rightNode = node.Clone();
        rightNode.Text = rightText;
        rightNode.Id = Guid.NewGuid().ToString("N");

        parent.Children[childIndex] = leftNode;
        parent.Children.Insert(childIndex + 1, rightNode);

        return (leftNode.Id, rightNode.Id);
    }

    // --- AST Traversal & Operations ---
    public AstNode? GetNodeByPath(int[] path)
    {
        if (path == null || path.Length == 0) return Document;
        AstNode current = Document;
        foreach (int idx in path)
        {
            if (current is ElementNode el && idx >= 0 && idx < el.Children.Count)
            {
                current = el.Children[idx];
            }
            else
            {
                return null;
            }
        }
        return current;
    }

    public int[]? FindPathById(string id)
    {
        var path = new List<int>();
        if (FindPathByIdRecursive(Document, id, path))
        {
            return path.ToArray();
        }
        return null;
    }

    private bool FindPathByIdRecursive(AstNode current, string id, List<int> path)
    {
        if (current.Id == id) return true;
        if (current is ElementNode el)
        {
            for (int i = 0; i < el.Children.Count; i++)
            {
                path.Add(i);
                if (FindPathByIdRecursive(el.Children[i], id, path))
                {
                    return true;
                }
                path.RemoveAt(path.Count - 1);
            }
        }
        return false;
    }

    public ElementNode? FindParent(AstNode root, AstNode child)
    {
        if (root is ElementNode el)
        {
            if (el.Children.Contains(child))
            {
                return el;
            }
            foreach (var subChild in el.Children)
            {
                var found = FindParent(subChild, child);
                if (found != null) return found;
            }
        }
        return null;
    }

    public TextNode GetTextNodeAt(int[] path)
    {
        var node = GetNodeByPath(path);
        if (node is TextNode tx) return tx;
        throw new InvalidOperationException($"Node at path {string.Join(",", path)} is not a TextNode");
    }

    public List<TextNode> GetTextNodesInRange(string startId, string endId)
    {
        var list = new List<TextNode>();
        bool inRange = false;
        CollectTextNodes(Document, startId, endId, ref inRange, list);
        return list;
    }

    private void CollectTextNodes(AstNode current, string startId, string endId, ref bool inRange, List<TextNode> list)
    {
        if (current is TextNode tx)
        {
            if (tx.Id == startId || tx.Id == endId)
            {
                if (tx.Id == startId && tx.Id == endId)
                {
                    list.Add(tx);
                    return;
                }
                if (!inRange)
                {
                    inRange = true;
                    list.Add(tx);
                }
                else
                {
                    list.Add(tx);
                    inRange = false;
                }
            }
            else if (inRange)
            {
                list.Add(tx);
            }
        }
        else if (current is ElementNode el)
        {
            foreach (var child in el.Children)
            {
                CollectTextNodes(child, startId, endId, ref inRange, list);
            }
        }
    }

    // --- AST Normalization & Reconciliation ---
    public void Normalize()
    {
        NormalizeElement(Document);
    }

    private void NormalizeElement(ElementNode element)
    {
        if (element == null) return;

        // First recursively normalize children
        for (int i = 0; i < element.Children.Count; i++)
        {
            if (element.Children[i] is ElementNode childEl)
            {
                NormalizeElement(childEl);
            }
        }

        // Merge adjacent TextNodes with the same formatting
        var newChildren = new List<AstNode>();
        TextNode? lastTextNode = null;

        foreach (var child in element.Children)
        {
            if (child is TextNode currentTextNode)
            {
                if (lastTextNode != null && lastTextNode.HasSameFormatting(currentTextNode))
                {
                    AdjustSelectionForMerge(currentTextNode.Id, lastTextNode.Id, lastTextNode.Text.Length);
                    lastTextNode.Text += currentTextNode.Text;
                }
                else
                {
                    newChildren.Add(currentTextNode);
                    lastTextNode = currentTextNode;
                }
            }
            else
            {
                newChildren.Add(child);
                lastTextNode = null;
            }
        }

        // Handle list nodes inside this element
        if (element.Type == "root" || element.Type == "list")
        {
            for (int i = 0; i < newChildren.Count; i++)
            {
                var child = newChildren[i];
                if (child is ElementNode childEl && childEl.Type == "list")
                {
                    if (childEl.Children.Count == 0)
                    {
                        newChildren.RemoveAt(i);
                        i--;
                        continue;
                    }

                    // Split list if it contains non-list-items (replaces the buggy pull-to-top behavior)
                    bool hasInvalidItem = childEl.Children.Any(c => c is not ElementNode el || el.Type != "list-item");
                    if (hasInvalidItem)
                    {
                        var splitList = new List<AstNode>();
                        ElementNode? currentSubList = null;

                        foreach (var listItem in childEl.Children)
                        {
                            if (listItem is ElementNode itemEl && itemEl.Type == "list-item")
                            {
                                if (currentSubList == null)
                                {
                                    currentSubList = new ElementNode("list") { Format = childEl.Format };
                                }
                                currentSubList.Children.Add(itemEl);
                            }
                            else
                            {
                                if (currentSubList != null)
                                {
                                    splitList.Add(currentSubList);
                                    currentSubList = null;
                                }
                                splitList.Add(listItem);
                            }
                        }

                        if (currentSubList != null)
                        {
                            splitList.Add(currentSubList);
                        }

                        newChildren.RemoveAt(i);
                        newChildren.InsertRange(i, splitList);
                        i += splitList.Count - 1;
                        continue;
                    }
                }
            }

            // Merge adjacent lists of the same format
            var mergedChildren = new List<AstNode>();
            ElementNode? lastList = null;
            foreach (var child in newChildren)
            {
                if (child is ElementNode currentList && currentList.Type == "list")
                {
                    if (lastList != null && lastList.Format == currentList.Format)
                    {
                        foreach (var item in currentList.Children)
                        {
                            lastList.Children.Add(item);
                        }
                    }
                    else
                    {
                        mergedChildren.Add(currentList);
                        lastList = currentList;
                    }
                }
                else
                {
                    mergedChildren.Add(child);
                    lastList = null;
                }
            }
            newChildren = mergedChildren;
        }

        // Ensure block elements (like paragraph, heading) have at least one text child
        bool isStructure = element.Type == "root" || element.Type == "list" || element.Type == "table" || element.Type == "table-row" || element.Type == "table-cell";
        if (!isStructure && element.Type != "image")
        {
            if (newChildren.Count == 0)
            {
                newChildren.Add(new TextNode(""));
            }
        }

        element.Children = newChildren;
    }

    private void AdjustSelectionForMerge(string removedNodeId, string targetNodeId, int offsetShift)
    {
        if (Selection.Anchor != null && Selection.Anchor.Path.Length > 0)
        {
            var anchorNode = GetNodeByPath(Selection.Anchor.Path);
            if (anchorNode?.Id == removedNodeId)
            {
                var newPath = FindPathById(targetNodeId);
                if (newPath != null)
                {
                    Selection.Anchor.Path = newPath;
                    Selection.Anchor.Offset += offsetShift;
                }
            }
        }

        if (Selection.Focus != null && Selection.Focus.Path.Length > 0)
        {
            var focusNode = GetNodeByPath(Selection.Focus.Path);
            if (focusNode?.Id == removedNodeId)
            {
                var newPath = FindPathById(targetNodeId);
                if (newPath != null)
                {
                    Selection.Focus.Path = newPath;
                    Selection.Focus.Offset += offsetShift;
                }
            }
        }
    }
}
