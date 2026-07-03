using System;
using System.Collections.Generic;
using System.Linq;
using AlphaRazor.EditorEngine.Models;

namespace AlphaRazor.EditorEngine.Services;

public class CommandExecuter
{
    private readonly EditorState _editorState;

    public CommandExecuter(EditorState editorState)
    {
        _editorState = editorState;
    }

    public void ToggleInlineFormat(string formatName)
    {
        _editorState.RecordHistory();

        var selection = _editorState.Selection;
        if (selection.Anchor == null || selection.Focus == null) return;

        if (selection.IsCollapsed)
        {
            _editorState.TogglePendingFormat(formatName);
            _editorState.NotifyStateChanged();
            return;
        }

        var (start, end) = selection.GetNormalizedSelection();
        string startNodeId = _editorState.GetTextNodeAt(start.Path).Id;
        string endNodeId = _editorState.GetTextNodeAt(end.Path).Id;

        var startSplit = _editorState.SplitTextNodeAt(start.Path, start.Offset);
        if (startSplit.RightId != null)
        {
            startNodeId = startSplit.RightId;
            start.Path = _editorState.FindPathById(startNodeId)!;
            start.Offset = 0;
        }

        var endPath = _editorState.FindPathById(endNodeId)!;
        var endSplit = _editorState.SplitTextNodeAt(endPath, end.Offset);
        if (endSplit.LeftId != null)
        {
            endNodeId = endSplit.LeftId;
            var endNodePath = _editorState.FindPathById(endNodeId)!;
            var endNode = (TextNode)_editorState.GetNodeByPath(endNodePath)!;
            end.Path = endNodePath;
            end.Offset = endNode.Text.Length;
        }

        var textNodes = _editorState.GetTextNodesInRange(startNodeId, endNodeId);
        bool allHaveFormat = true;
        foreach (var node in textNodes)
        {
            if (!GetFormatValue(node, formatName))
            {
                allHaveFormat = false;
                break;
            }
        }
        bool targetValue = !allHaveFormat;

        foreach (var node in textNodes)
        {
            SetFormatValue(node, formatName, targetValue);
        }

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void ApplyColorFormat(string hexColor)
    {
        _editorState.RecordHistory();

        var selection = _editorState.Selection;
        if (selection.Anchor == null || selection.Focus == null) return;

        if (selection.IsCollapsed)
        {
            _editorState.SetPendingColor(hexColor == "default" ? null : hexColor);
            _editorState.NotifyStateChanged();
            return;
        }

        var (start, end) = selection.GetNormalizedSelection();
        string startNodeId = _editorState.GetTextNodeAt(start.Path).Id;
        string endNodeId = _editorState.GetTextNodeAt(end.Path).Id;

        var startSplit = _editorState.SplitTextNodeAt(start.Path, start.Offset);
        if (startSplit.RightId != null)
        {
            startNodeId = startSplit.RightId;
            start.Path = _editorState.FindPathById(startNodeId)!;
            start.Offset = 0;
        }

        var endPath = _editorState.FindPathById(endNodeId)!;
        var endSplit = _editorState.SplitTextNodeAt(endPath, end.Offset);
        if (endSplit.LeftId != null)
        {
            endNodeId = endSplit.LeftId;
            var endNodePath = _editorState.FindPathById(endNodeId)!;
            var endNode = (TextNode)_editorState.GetNodeByPath(endNodePath)!;
            end.Path = endNodePath;
            end.Offset = endNode.Text.Length;
        }

        var textNodes = _editorState.GetTextNodesInRange(startNodeId, endNodeId);
        foreach (var node in textNodes)
        {
            node.Color = hexColor == "default" ? null : hexColor;
        }

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void ToggleLink(string? url)
    {
        _editorState.RecordHistory();

        var selection = _editorState.Selection;
        if (selection.Anchor == null || selection.Focus == null) return;

        if (selection.IsCollapsed)
        {
            // For collapsed selection, insert a link with the URL as text
            if (!string.IsNullOrEmpty(url))
            {
                _editorState.InsertText(url);
                var (start, end) = selection.GetNormalizedSelection();
                string nodeId = _editorState.GetTextNodeAt(start.Path).Id;
                var nodes = _editorState.GetTextNodesInRange(nodeId, nodeId);
                if (nodes.Count > 0)
                {
                    nodes[0].LinkUrl = url;
                    nodes[0].Underline = true;
                }
            }
            _editorState.Normalize();
            _editorState.NotifyStateChanged();
            return;
        }

        var (startNorm, endNorm) = selection.GetNormalizedSelection();
        string startNodeId = _editorState.GetTextNodeAt(startNorm.Path).Id;
        string endNodeId = _editorState.GetTextNodeAt(endNorm.Path).Id;

        bool sameNode = startNodeId == endNodeId;

        var startSplit = _editorState.SplitTextNodeAt(startNorm.Path, startNorm.Offset);
        if (startSplit.RightId != null)
        {
            startNodeId = startSplit.RightId;
            startNorm.Path = _editorState.FindPathById(startNodeId)!;
            
            if (sameNode)
            {
                endNodeId = startNodeId;
                endNorm.Offset -= startNorm.Offset;
            }
            startNorm.Offset = 0;
        }

        var endPath = _editorState.FindPathById(endNodeId)!;
        var endSplit = _editorState.SplitTextNodeAt(endPath, endNorm.Offset);
        if (endSplit.LeftId != null)
        {
            endNodeId = endSplit.LeftId;
            var endNodePath = _editorState.FindPathById(endNodeId)!;
            var endNode = (TextNode)_editorState.GetNodeByPath(endNodePath)!;
            endNorm.Path = endNodePath;
            endNorm.Offset = endNode.Text.Length;
        }

        var textNodes = _editorState.GetTextNodesInRange(startNodeId, endNodeId);
        foreach (var node in textNodes)
        {
            node.LinkUrl = string.IsNullOrEmpty(url) ? null : url;
            if (!string.IsNullOrEmpty(url))
            {
                node.Underline = true; // standard styling for links
            }
        }

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void FormatBlock(string blockType, int? headingLevel = null)
    {
        _editorState.RecordHistory();

        var blocks = GetBlocksInSelection();
        foreach (var block in blocks)
        {
            block.Type = blockType;
            if (blockType == "heading")
            {
                block.Level = headingLevel ?? 1;
            }
            else
            {
                block.Attributes.Remove("level");
            }
        }

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void AlignBlock(string alignment)
    {
        _editorState.RecordHistory();

        var blocks = GetBlocksInSelection();
        foreach (var block in blocks)
        {
            block.Align = alignment == "left" ? null : alignment;
        }

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void ToggleList(string listFormat)
    {
        _editorState.RecordHistory();

        var selection = _editorState.Selection;
        if (selection.Anchor == null || selection.Focus == null) return;

        var blocks = GetBlocksInSelection();
        if (blocks.Count == 0) return;

        bool isInTargetList = false;
        var firstBlock = blocks[0];
        var parent = _editorState.FindParent(_editorState.Document, firstBlock);
        if (parent != null && parent.Type == "list" && parent.Format == listFormat)
        {
            isInTargetList = true;
        }

        if (isInTargetList)
        {
            // Group the unique parent list nodes containing selected blocks
            var parentLists = blocks
                .Select(b => _editorState.FindParent(_editorState.Document, b))
                .Where(p => p != null && p.Type == "list")
                .Distinct()
                .Cast<ElementNode>()
                .ToList();

            foreach (var listNode in parentLists)
            {
                var grandparent = _editorState.FindParent(_editorState.Document, listNode);
                if (grandparent == null) continue;

                int listIdx = grandparent.Children.IndexOf(listNode);
                if (listIdx == -1) continue;

                var newGrandparentChildren = new List<AstNode>();
                
                // Add siblings before this list
                for (int i = 0; i < listIdx; i++)
                {
                    newGrandparentChildren.Add(grandparent.Children[i]);
                }

                ElementNode? currentSubList = null;

                foreach (var child in listNode.Children)
                {
                    if (child is ElementNode childEl)
                    {
                        bool isSelected = blocks.Contains(childEl);
                        if (isSelected && childEl.Type == "list-item")
                        {
                            // Close and add current sublist
                            if (currentSubList != null)
                            {
                                if (currentSubList.Children.Count > 0)
                                {
                                    newGrandparentChildren.Add(currentSubList);
                                }
                                currentSubList = null;
                            }

                            // Convert to paragraph
                            childEl.Type = "paragraph";
                            newGrandparentChildren.Add(childEl);
                        }
                        else
                        {
                            // Stays in a list
                            if (currentSubList == null)
                            {
                                currentSubList = new ElementNode("list") { Format = listNode.Format };
                            }
                            currentSubList.Children.Add(childEl);
                        }
                    }
                    else
                    {
                        newGrandparentChildren.Add(child);
                    }
                }

                // Add any remaining sublist
                if (currentSubList != null && currentSubList.Children.Count > 0)
                {
                    newGrandparentChildren.Add(currentSubList);
                }

                // Add siblings after this list
                for (int i = listIdx + 1; i < grandparent.Children.Count; i++)
                {
                    newGrandparentChildren.Add(grandparent.Children[i]);
                }

                grandparent.Children = newGrandparentChildren;
            }
        }
        else
        {
            // Convert list format if already in a list of different format
            var differentFormatLists = blocks
                .Select(b => _editorState.FindParent(_editorState.Document, b))
                .Where(p => p != null && p.Type == "list" && p.Format != listFormat)
                .Distinct()
                .Cast<ElementNode>()
                .ToList();

            foreach (var lst in differentFormatLists)
            {
                lst.Format = listFormat;
            }

            // For other blocks (not currently in lists), wrap them into list-items
            var nonListBlocks = blocks.Where(b => {
                var p = _editorState.FindParent(_editorState.Document, b);
                return p == null || p.Type != "list";
            }).ToList();

            if (nonListBlocks.Count > 0)
            {
                var firstBlockParent = _editorState.FindParent(_editorState.Document, nonListBlocks[0]);
                if (firstBlockParent != null)
                {
                    var listNode = new ElementNode("list") { Format = listFormat };
                    int insertIdx = firstBlockParent.Children.IndexOf(nonListBlocks[0]);
                    if (insertIdx != -1)
                    {
                        firstBlockParent.Children.Insert(insertIdx, listNode);
                        foreach (var block in nonListBlocks)
                        {
                            var blockParent = _editorState.FindParent(_editorState.Document, block);
                            if (blockParent != null)
                            {
                                blockParent.Children.Remove(block);
                            }
                            block.Type = "list-item";
                            listNode.Children.Add(block);
                        }
                    }
                }
            }
        }

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void InsertImage(string url, string alt)
    {
        _editorState.RecordHistory();

        var selection = _editorState.Selection;
        if (selection.Anchor == null) return;

        var currentBlockPath = selection.Anchor.Path.Take(1).ToArray();
        var parent = _editorState.Document;
        int insertIndex = currentBlockPath.Length > 0 ? currentBlockPath[0] : 0;

        var imageBlock = new ElementNode("image") { Url = url, Alt = alt };
        imageBlock.Children.Add(new TextNode(""));

        if (insertIndex < parent.Children.Count)
        {
            var currentBlock = parent.Children[insertIndex] as ElementNode;
            if (currentBlock != null && currentBlock.Children.Count == 1 && currentBlock.Children[0] is TextNode tx && string.IsNullOrEmpty(tx.Text))
            {
                parent.Children[insertIndex] = imageBlock;
            }
            else
            {
                parent.Children.Insert(insertIndex + 1, imageBlock);
                insertIndex++;
            }
        }
        else
        {
            parent.Children.Add(imageBlock);
            insertIndex = parent.Children.Count - 1;
        }

        selection.Anchor = new PathOffset { Path = new[] { insertIndex, 0 }, Offset = 0 };
        selection.Focus = selection.Anchor.Clone();

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    public void InsertTable(int rows, int cols)
    {
        _editorState.RecordHistory();

        var selection = _editorState.Selection;
        if (selection.Anchor == null) return;

        var tableNode = new ElementNode("table");
        for (int r = 0; r < rows; r++)
        {
            var rowNode = new ElementNode("table-row");
            for (int c = 0; c < cols; c++)
            {
                var cellNode = new ElementNode("table-cell");
                var para = new ElementNode("paragraph");
                para.Children.Add(new TextNode(""));
                cellNode.Children.Add(para);
                rowNode.Children.Add(cellNode);
            }
            tableNode.Children.Add(rowNode);
        }

        var currentBlockPath = selection.Anchor.Path.Take(1).ToArray();
        var parent = _editorState.Document;
        int insertIndex = currentBlockPath.Length > 0 ? currentBlockPath[0] : 0;

        if (insertIndex < parent.Children.Count)
        {
            var currentBlock = parent.Children[insertIndex] as ElementNode;
            if (currentBlock != null && currentBlock.Children.Count == 1 && currentBlock.Children[0] is TextNode tx && string.IsNullOrEmpty(tx.Text))
            {
                parent.Children[insertIndex] = tableNode;
            }
            else
            {
                parent.Children.Insert(insertIndex + 1, tableNode);
                insertIndex++;
            }
        }
        else
        {
            parent.Children.Add(tableNode);
            insertIndex = parent.Children.Count - 1;
        }

        selection.Anchor = new PathOffset { Path = new[] { insertIndex, 0, 0, 0, 0 }, Offset = 0 };
        selection.Focus = selection.Anchor.Clone();

        _editorState.Normalize();
        _editorState.NotifyStateChanged();
    }

    // --- Internal Helpers ---
    private List<ElementNode> GetBlocksInSelection()
    {
        var blocks = new List<ElementNode>();
        var selection = _editorState.Selection;
        if (selection.Anchor == null || selection.Focus == null) return blocks;

        var (start, end) = selection.GetNormalizedSelection();
        string startNodeId = _editorState.GetTextNodeAt(start.Path).Id;
        string endNodeId = _editorState.GetTextNodeAt(end.Path).Id;

        bool inRange = false;
        CollectBlocksInRange(_editorState.Document, startNodeId, endNodeId, ref inRange, blocks);
        return blocks;
    }

    private void CollectBlocksInRange(AstNode current, string startNodeId, string endNodeId, ref bool inRange, List<ElementNode> blocks)
    {
        if (current is TextNode tx)
        {
            if (tx.Id == startNodeId || tx.Id == endNodeId)
            {
                if (tx.Id == startNodeId && tx.Id == endNodeId)
                {
                    inRange = true;
                    return;
                }
                inRange = !inRange;
            }
        }
        else if (current is ElementNode el)
        {
            bool isBlock = el.Type == "paragraph" || el.Type == "heading" || el.Type == "blockquote" || el.Type == "code-block" || el.Type == "list-item";
            bool childContainsStartOrEnd = false;

            foreach (var child in el.Children)
            {
                bool wasInRange = inRange;
                CollectBlocksInRange(child, startNodeId, endNodeId, ref inRange, blocks);
                if (inRange || wasInRange || (child is TextNode t && (t.Id == startNodeId || t.Id == endNodeId)))
                {
                    childContainsStartOrEnd = true;
                }
            }

            if (isBlock && (inRange || childContainsStartOrEnd))
            {
                if (!blocks.Contains(el))
                {
                    blocks.Add(el);
                }
            }
        }
    }

    private bool GetFormatValue(TextNode node, string formatName)
    {
        return formatName.ToLower() switch
        {
            "bold" => node.Bold,
            "italic" => node.Italic,
            "underline" => node.Underline,
            "strikethrough" => node.Strikethrough,
            "subscript" => node.Subscript,
            "superscript" => node.Superscript,
            _ => false
        };
    }

    private void SetFormatValue(TextNode node, string formatName, bool value)
    {
        switch (formatName.ToLower())
        {
            case "bold": node.Bold = value; break;
            case "italic": node.Italic = value; break;
            case "underline": node.Underline = value; break;
            case "strikethrough": node.Strikethrough = value; break;
            case "subscript": node.Subscript = value; node.Superscript = false; break;
            case "superscript": node.Superscript = value; node.Subscript = false; break;
        }
    }
}
