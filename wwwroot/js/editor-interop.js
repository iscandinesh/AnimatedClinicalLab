// Global helper: highlights grid cells up to (row, col) in the table size picker
window.highlightGrid = function (row, col) {
    document.querySelectorAll('.grid-cell').forEach((cell, idx) => {
        const r = Math.floor(idx / 8) + 1;
        const c = (idx % 8) + 1;
        if (r <= row && c <= col) {
            cell.classList.add('grid-cell-selected');
        } else {
            cell.classList.remove('grid-cell-selected');
        }
    });
    const lbl = document.getElementById('grid-label');
    if (lbl) lbl.textContent = `${row} × ${col}`;
};

window.tablePanel = {
    selectedRows: 3,
    selectedCols: 3,
    
    init: function () {
        const picker = document.getElementById('table-grid-picker');
        if (!picker) return;
        picker.innerHTML = '';
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.setAttribute('data-row', r);
                cell.setAttribute('data-col', c);
                cell.addEventListener('mouseover', () => this.hoverGrid(r, c));
                cell.addEventListener('click', () => {
                    this.hoverGrid(r, c);
                    this.insertTable();
                });
                picker.appendChild(cell);
            }
        }
        this.resetGrid();
    },

    hoverGrid: function (row, col) {
        this.selectedRows = row;
        this.selectedCols = col;
        window.highlightGrid(row, col);
        const insertLbl = document.getElementById('grid-insert-label');
        if (insertLbl) insertLbl.textContent = `${row} × ${col}`;
    },

    resetGrid: function () {
        this.hoverGrid(3, 3);
    },

    insertTable: function () {
        if (!window.tiptapInstance) return;
        const styleSelect = document.getElementById('tp-border-style');
        const widthSelect = document.getElementById('tp-border-width');
        const colorInput = document.getElementById('tp-border-color');
        
        const borderStyle = styleSelect ? styleSelect.value : 'solid';
        const borderWidth = widthSelect ? widthSelect.value : '2px';
        const borderColor = colorInput ? colorInput.value : '#94a3b8';
        
        let alignment = this.getAlignment();
        
        window.editorInterop.execute('insertTableWithAttrs', {
            rows: this.selectedRows,
            cols: this.selectedCols,
            borderColor: borderColor,
            borderWidth: borderWidth,
            borderStyle: borderStyle,
            alignment: alignment
        });
        
        // Blur dropdown or focus editor
        const root = document.getElementById('table-dropdown-root');
        if (root) root.blur();
    },

    applyPreset: function (style, color, width) {
        const styleSelect = document.getElementById('tp-border-style');
        const widthSelect = document.getElementById('tp-border-width');
        const colorInput = document.getElementById('tp-border-color');
        
        if (styleSelect) styleSelect.value = style;
        if (widthSelect) widthSelect.value = width;
        if (colorInput) colorInput.value = color;
        
        window.editorInterop.applyTablePreset(style, color, width);
    },

    applyBorder: function () {
        const styleSelect = document.getElementById('tp-border-style');
        const widthSelect = document.getElementById('tp-border-width');
        const colorInput = document.getElementById('tp-border-color');
        
        const style = styleSelect ? styleSelect.value : 'solid';
        const width = widthSelect ? widthSelect.value : '2px';
        const color = colorInput ? colorInput.value : '#94a3b8';
        
        window.editorInterop.execute('setTableAttributes', {
            borderColor: color,
            borderWidth: width,
            borderStyle: style,
            alignment: this.getAlignment()
        });
    },

    setColor: function (color) {
        const colorInput = document.getElementById('tp-border-color');
        if (colorInput) {
            colorInput.value = color;
        }
        this.applyBorder();
    },

    getAlignment: function () {
        if (document.getElementById('tp-align-left')?.classList.contains('align-btn-active')) return 'left';
        if (document.getElementById('tp-align-right')?.classList.contains('align-btn-active')) return 'right';
        return 'center';
    },

    setAlign: function (alignment) {
        const btnLeft = document.getElementById('tp-align-left');
        const btnCenter = document.getElementById('tp-align-center');
        const btnRight = document.getElementById('tp-align-right');
        
        if (btnLeft) btnLeft.classList.toggle('align-btn-active', alignment === 'left');
        if (btnCenter) btnCenter.classList.toggle('align-btn-active', alignment === 'center');
        if (btnRight) btnRight.classList.toggle('align-btn-active', alignment === 'right');
        
        if (window.tiptapInstance && window.tiptapInstance.isActive('table')) {
            this.applyBorder();
        }
    }
};

// Initialize tablePanel on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.tablePanel.init());
} else {
    setTimeout(() => window.tablePanel.init(), 100);
}

(function () {
    // ─── Floating Diagnostic Console (Disabled) ───────────────────────────────
    function logDiag(msg, color = '#38bdf8') {
        // Noop
    }

    // ─── Toolbar focus-lock helpers (legacy, kept for compatibility) ────────────
    let isInteractingWithToolbar = false;

    document.addEventListener('mousedown', function (e) {
        if (
            e.target.closest('.rte-toolbar') ||
            e.target.closest('.rte-modal') ||
            e.target.closest('.rte-modal-backdrop') ||
            e.target.closest('.rte-btn') ||
            e.target.closest('select')
        ) {
            isInteractingWithToolbar = true;
        }
    });

    document.addEventListener('mouseup', function () {
        if (isInteractingWithToolbar) {
            setTimeout(function () { isInteractingWithToolbar = false; }, 150);
        }
    });

    // ─── DOM helpers ────────────────────────────────────────────────────────────
    function findNodeIdAndOffset(node, offset) {
        if (!node) return null;
        let current = node;
        if (current.nodeType === Node.TEXT_NODE) {
            let parent = current.parentElement;
            while (parent) {
                if (parent.hasAttribute('data-node-id')) {
                    return { id: parent.getAttribute('data-node-id'), offset: offset };
                }
                parent = parent.parentElement;
            }
        } else if (current.nodeType === Node.ELEMENT_NODE) {
            if (current.hasAttribute('data-node-id')) {
                return { id: current.getAttribute('data-node-id'), offset: offset };
            }
            let child = current.querySelector('[data-node-id]');
            if (child) return { id: child.getAttribute('data-node-id'), offset: 0 };
        }
        return null;
    }

    function getTextNode(el) {
        if (el.nodeType === Node.TEXT_NODE) return el;
        for (let child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) return child;
            let sub = getTextNode(child);
            if (sub) return sub;
        }
        return el;
    }

    function isBefore(node1, offset1, node2, offset2) {
        const position = node1.compareDocumentPosition(node2);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return true;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return false;
        return offset1 <= offset2;
    }

    function setDomSelection(anchorId, anchorOffset, focusId, focusOffset) {
        const editorEl = document.querySelector('.rte-content-editor');
        if (editorEl && document.activeElement !== editorEl) editorEl.focus();

        const anchorEl = document.querySelector(`[data-node-id="${anchorId}"]`);
        const focusEl  = document.querySelector(`[data-node-id="${focusId}"]`);
        if (!anchorEl || !focusEl) return;

        const anchorNode = getTextNode(anchorEl);
        const focusNode  = getTextNode(focusEl);
        const sel = window.getSelection();
        sel.removeAllRanges();

        const safeAnchorOffset = Math.min(anchorOffset, anchorNode.length || 0);
        const safeFocusOffset  = Math.min(focusOffset,  focusNode.length  || 0);

        const range = document.createRange();
        range.setStart(anchorNode, safeAnchorOffset);
        range.setEnd(focusNode, safeFocusOffset);

        if (isBefore(anchorNode, safeAnchorOffset, focusNode, safeFocusOffset)) {
            sel.addRange(range);
        } else {
            const tempRange = document.createRange();
            tempRange.setStart(anchorNode, safeAnchorOffset);
            tempRange.collapse(true);
            sel.addRange(tempRange);
            sel.extend(focusNode, safeFocusOffset);
        }
    }

    // ─── HTML → AST parser (used for Markdown conversion) ─────────────────────
    function parseDomNode(domNode, activeStyles) {
        activeStyles = activeStyles || {};
        if (domNode.nodeType === Node.TEXT_NODE) {
            const text = domNode.textContent;
            if (!text.trim() && domNode.parentElement && domNode.parentElement.nodeName === 'BODY') return null;
            return {
                $type: 'text', text,
                bold: !!activeStyles.bold, italic: !!activeStyles.italic,
                underline: !!activeStyles.underline, strikethrough: !!activeStyles.strikethrough,
                subscript: !!activeStyles.subscript, superscript: !!activeStyles.superscript,
                code: !!activeStyles.code,
                color: activeStyles.color || null, linkUrl: activeStyles.linkUrl || null,
                attributes: {}
            };
        }
        if (domNode.nodeType !== Node.ELEMENT_NODE) return null;

        if (domNode.classList && domNode.classList.contains('page-break')) {
            return { $type: 'element', type: 'page-break', children: [{ $type: 'text', text: '' }], attributes: {} };
        }

        const tagName   = domNode.nodeName.toUpperCase();
        const newStyles = Object.assign({}, activeStyles);
        let   isInline  = false;

        if      (tagName === 'STRONG' || tagName === 'B')                { newStyles.bold          = true;  newStyles.superscript = false; isInline = true; }
        else if (tagName === 'EM'     || tagName === 'I')                { newStyles.italic        = true;  isInline = true; }
        else if (tagName === 'U')                                        { newStyles.underline     = true;  isInline = true; }
        else if (tagName === 'S' || tagName === 'DEL' || tagName === 'STRIKE') { newStyles.strikethrough = true; isInline = true; }
        else if (tagName === 'SUB')                                      { newStyles.subscript     = true;  newStyles.superscript = false; isInline = true; }
        else if (tagName === 'SUP')                                      { newStyles.superscript   = true;  newStyles.subscript   = false; isInline = true; }
        else if (tagName === 'SPAN')  { isInline = true; if (domNode.style.color) newStyles.color = domNode.style.color; }
        else if (tagName === 'A')     { isInline = true; newStyles.linkUrl = domNode.getAttribute('href'); newStyles.underline = true; }
        else if (tagName === 'CODE') {
            let parent = domNode.parentElement;
            let insidePre = false;
            while (parent) {
                if (parent.tagName === 'PRE') {
                    insidePre = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (!insidePre) {
                newStyles.code = true;
                isInline = true;
            }
        }

        if (isInline) {
            const nodes = [];
            for (let child of domNode.childNodes) {
                const p = parseDomNode(child, newStyles);
                if (p) Array.isArray(p) ? nodes.push(...p) : nodes.push(p);
            }
            return nodes;
        }

        if (tagName === 'IMG') {
            let width = domNode.style.width || domNode.getAttribute('width') || '100%';
            let alignment = 'center';
            if (domNode.style.float === 'left') alignment = 'left';
            else if (domNode.style.float === 'right') alignment = 'right';
            else if (domNode.style.margin && domNode.style.margin.includes('auto')) alignment = 'center';
            
            return { 
                $type: 'element', 
                type: 'image', 
                children: [{ $type: 'text', text: '' }],
                attributes: { 
                    url: domNode.getAttribute('src') || '', 
                    alt: domNode.getAttribute('alt') || '',
                    width: width,
                    alignment: alignment
                } 
            };
        }

        if (tagName === 'IFRAME' || tagName === 'VIDEO') {
            return {
                $type: 'element',
                type: 'video',
                children: [{ $type: 'text', text: '' }],
                attributes: {
                    url: domNode.getAttribute('src') || ''
                }
            };
        }

        if (tagName === 'HR') {
            return {
                $type: 'element',
                type: 'horizontal-rule',
                children: [{ $type: 'text', text: '' }],
                attributes: {}
            };
        }

        let type = 'paragraph';
        const attributes = {};
        if      (tagName === 'P')              { type = 'paragraph'; }
        else if (/^H[1-6]$/.test(tagName))    { type = 'heading';    attributes.level = parseInt(tagName[1]); }
        else if (tagName === 'BLOCKQUOTE')     { type = 'blockquote'; }
        else if (tagName === 'PRE')            { type = 'code-block'; }
        else if (tagName === 'CODE')           { type = 'code-block'; }
        else if (tagName === 'UL')             { type = 'list';       attributes.format = domNode.getAttribute('data-type') === 'taskList' ? 'task' : 'unordered'; }
        else if (tagName === 'OL')             { type = 'list';       attributes.format = 'ordered'; }
        else if (tagName === 'LI')             {
            type = 'list-item';
            if (domNode.getAttribute('data-type') === 'taskItem' || domNode.hasAttribute('data-checked') || domNode.querySelector('input[type="checkbox"]')) {
                attributes.checked = domNode.getAttribute('data-checked') === 'true' || 
                                     (domNode.querySelector('input[type="checkbox"]') && domNode.querySelector('input[type="checkbox"]').checked);
            }
        }
        else if (tagName === 'TABLE') {
            type = 'table';
            let style = domNode.getAttribute('style') || '';
            let match = style.match(/--table-border-color:\s*([^;]+)/) || style.match(/border-color:\s*([^;]+)/);
            let colorVal = '#94a3b8';
            if (match && match[1]) {
                colorVal = match[1].trim();
            } else {
                let attrColor = domNode.getAttribute('data-border-color');
                if (attrColor) colorVal = attrColor;
            }
            attributes.borderColor = colorVal;
        }
        else if (tagName === 'TR')             { type = 'table-row'; }
        else if (tagName === 'TD')             { type = 'table-cell'; }
        else if (tagName === 'TH')             { type = 'table-header'; }
        else {
            // Unknown block — recurse children, return flat list
            const kids = [];
            for (let child of domNode.childNodes) {
                const p = parseDomNode(child, activeStyles);
                if (p) Array.isArray(p) ? kids.push(...p) : kids.push(p);
            }
            return kids;
        }

        const children = [];
        for (let child of domNode.childNodes) {
            const p = parseDomNode(child, activeStyles);
            if (p) Array.isArray(p) ? children.push(...p) : children.push(p);
        }
        return { $type: 'element', type, children, attributes };
    }

    function setCellAttribute(editor, attributeName, value) {
        const { state, dispatch } = editor.view;
        const { tr, selection } = state;
        let hasChanges = false;
        
        const updateDomCell = (pos, attr, val) => {
            setTimeout(() => {
                const domCell = editor.view.nodeDOM(pos);
                if (domCell) {
                    if (attr === 'backgroundColor') {
                        domCell.style.backgroundColor = val || '';
                        if (val) domCell.setAttribute('data-background-color', val);
                        else domCell.removeAttribute('data-background-color');
                    } else if (attr === 'padding') {
                        domCell.style.padding = val || '';
                        if (val) domCell.setAttribute('data-padding', val);
                        else domCell.removeAttribute('data-padding');
                    }
                }
            }, 20);
        };

        if (selection.forEachCell) {
            selection.forEachCell((node, pos) => {
                if (node.attrs[attributeName] !== value) {
                    tr.setNodeMarkup(pos, null, {
                        ...node.attrs,
                        [attributeName]: value
                    });
                    hasChanges = true;
                    updateDomCell(pos, attributeName, value);
                }
            });
        } else {
            const $from = selection.$from;
            for (let depth = $from.depth; depth > 0; depth--) {
                const node = $from.node(depth);
                if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                    const pos = $from.before(depth);
                    tr.setNodeMarkup(pos, null, {
                        ...node.attrs,
                        [attributeName]: value
                    });
                    hasChanges = true;
                    updateDomCell(pos, attributeName, value);
                    break;
                }
            }
        }
        
        if (hasChanges) {
            dispatch(tr);
            return true;
        }
        return false;
    }

    function setTableAttribute(editor, attributes) {
        const { state, dispatch } = editor.view;
        const { tr, selection } = state;
        
        const $from = selection.$from;
        let tablePos = -1;
        let tableNode = null;
        
        for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'table') {
                tablePos = $from.before(depth);
                tableNode = node;
                break;
            }
        }
        
        if (tableNode && tablePos !== -1) {
            const newAttrs = {
                ...tableNode.attrs,
                ...attributes
            };
            tr.setNodeMarkup(tablePos, null, newAttrs);
            dispatch(tr);
            
            // Force immediate real-time style update on table and all cells
            const applyBorderStyles = () => {
                const domTable = editor.view.nodeDOM(tablePos);
                if (!domTable) return;
                const actualTable = domTable.tagName === 'TABLE' ? domTable : (domTable.querySelector('table') || domTable);
                const borderColor = newAttrs.borderColor || '#94a3b8';
                const borderWidth = newAttrs.borderWidth || '2px';
                const borderStyle = newAttrs.borderStyle || 'solid';
                const alignment  = newAttrs.alignment  || 'center';
                const borderVal  = `${borderWidth} ${borderStyle} ${borderColor}`;

                // CSS variables for new cells rendered later
                actualTable.style.setProperty('--table-border-color', borderColor);
                actualTable.style.setProperty('--table-border-style', borderStyle);
                actualTable.style.setProperty('--table-border-width', borderWidth);

                // Outer table border style
                actualTable.style.borderColor = borderColor;
                actualTable.style.borderStyle = borderStyle;
                actualTable.style.borderWidth = borderWidth;
                
                actualTable.setAttribute('data-border-color', borderColor);
                actualTable.setAttribute('data-border-style', borderStyle);
                actualTable.setAttribute('data-border-width', borderWidth);
                actualTable.setAttribute('data-alignment', alignment);

                // Alignment class
                actualTable.classList.remove('table-align-left', 'table-align-center', 'table-align-right');
                actualTable.classList.add(`table-align-${alignment}`);

                // ── KEY FIX: apply border directly to every td/th in real-time ──
                actualTable.querySelectorAll('td, th').forEach(cell => {
                    cell.style.setProperty('--table-border-color', borderColor);
                    cell.style.setProperty('--table-border-style', borderStyle);
                    cell.style.setProperty('--table-border-width', borderWidth);
                });
            };
            applyBorderStyles();
            setTimeout(applyBorderStyles, 50);
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Public API
    // ═══════════════════════════════════════════════════════════════════════════
    window.editorInterop = {

        currentPageIndex: 0,
        totalPagesCount: 1,

        isSelectionInTable: function (editor) {
            if (!editor) return false;
            const { $from } = editor.state.selection;
            for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type.name === 'table') {
                    return true;
                }
            }
            return false;
        },

        // Apply a preset border style to the currently focused table
        applyTablePreset: function (style, color, width) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            if (!window.editorInterop.isSelectionInTable(editor)) {
                alert('Please click inside a table first to apply a preset style.');
                return;
            }
            const { state, dispatch } = editor.view;
            const { tr, selection } = state;
            const $from = selection.$from;
            let tablePos = -1, tableNode = null;
            for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type.name === 'table') {
                    tablePos = $from.before(d);
                    tableNode = $from.node(d);
                    break;
                }
            }
            if (!tableNode) return;
            const newAttrs = { ...tableNode.attrs, borderStyle: style, borderColor: color, borderWidth: width };
            tr.setNodeMarkup(tablePos, null, newAttrs);
            dispatch(tr);
            // Immediate DOM update
            const domTable = editor.view.nodeDOM(tablePos);
            if (domTable) {
                const actualTable = domTable.tagName === 'TABLE' ? domTable : (domTable.querySelector('table') || domTable);
                
                actualTable.style.borderColor = color;
                actualTable.style.borderStyle = style;
                actualTable.style.borderWidth = width;
                
                actualTable.style.setProperty('--table-border-color', color);
                actualTable.style.setProperty('--table-border-style', style);
                actualTable.style.setProperty('--table-border-width', width);
                
                actualTable.querySelectorAll('td, th').forEach(cell => {
                    cell.style.setProperty('--table-border-color', color);
                    cell.style.setProperty('--table-border-style', style);
                    cell.style.setProperty('--table-border-width', width);
                });
            }
        },


        updatePageLabel: function () {
            const currentLbl = document.getElementById('lbl-current-page');
            const totalLbl = document.getElementById('lbl-total-pages');
            if (currentLbl) currentLbl.innerText = window.editorInterop.currentPageIndex + 1;
            if (totalLbl) totalLbl.innerText = window.editorInterop.totalPagesCount;
        },

        goToPage: function (direction) {
            logDiag(`[goToPage] direction: ${direction}`);
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const editorEl = document.querySelector('.ProseMirror');
            if (!editorEl) return;
            const pageBreaks = Array.from(editorEl.querySelectorAll('.page-break'));
            const total = pageBreaks.length + 1;
            window.editorInterop.totalPagesCount = total;
            
            let targetIndex = window.editorInterop.currentPageIndex;
            if (direction === 'prev' || direction === 'up') {
                targetIndex = Math.max(0, targetIndex - 1);
            } else if (direction === 'next' || direction === 'down') {
                targetIndex = Math.min(total - 1, targetIndex + 1);
            }
            
            window.editorInterop.currentPageIndex = targetIndex;
            window.editorInterop.updatePageLabel();
            window.editorInterop.scrollToPage(targetIndex);
        },

        scrollToPage: function (pageIndex) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const editorEl = document.querySelector('.ProseMirror');
            if (!editorEl) return;
            const pageBreaks = Array.from(editorEl.querySelectorAll('.page-break'));
            
            let targetElement = null;
            if (pageIndex === 0) {
                targetElement = editorEl.firstElementChild;
            } else if (pageIndex > 0 && pageIndex <= pageBreaks.length) {
                const breakEl = pageBreaks[pageIndex - 1];
                targetElement = breakEl.nextElementSibling || breakEl;
            }
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Focus the editor near this element
                const { view } = editor;
                try {
                    const pos = view.posAtDOM(targetElement, 0);
                    if (pos !== undefined && pos !== null) {
                        editor.commands.focus(pos);
                    }
                } catch (e) { /* ignore */ }
            }
        },

        updateCurrentPageFromSelection: function (editor) {
            if (!editor) return;
            const { state } = editor;
            const { selection } = state;
            const pos = selection.from;
            
            const editorEl = document.querySelector('.ProseMirror');
            if (!editorEl) return;
            const pageBreaks = Array.from(editorEl.querySelectorAll('.page-break'));
            
            let activePage = 0;
            for (let i = 0; i < pageBreaks.length; i++) {
                const breakEl = pageBreaks[i];
                try {
                    const breakPos = editor.view.posAtDOM(breakEl, 0);
                    if (pos > breakPos) {
                        activePage = i + 1;
                    } else {
                        break;
                    }
                } catch (e) { /* ignore */ }
            }
            
            window.editorInterop.currentPageIndex = activePage;
            window.editorInterop.totalPagesCount = pageBreaks.length + 1;
            window.editorInterop.updatePageLabel();
        },

        syncAllTablesStyles: function (editor) {
            if (!editor) return;
            const editorEl = editor.view.dom;
            if (!editorEl) return;
            
            const { doc } = editor.state;
            doc.descendants((node, pos) => {
                if (node.type.name === 'table') {
                    const domTable = editor.view.nodeDOM(pos);
                    if (domTable) {
                        const actualTable = domTable.tagName === 'TABLE' ? domTable : (domTable.querySelector('table') || domTable);
                        const { borderColor, borderWidth, borderStyle, alignment } = node.attrs;
                        
                        const color = borderColor || '#94a3b8';
                        const width = borderWidth || '2px';
                        const style = borderStyle || 'solid';
                        const align = alignment || 'center';
                        
                        actualTable.style.setProperty('--table-border-color', color);
                        actualTable.style.setProperty('--table-border-style', style);
                        actualTable.style.setProperty('--table-border-width', width);
                        
                        actualTable.style.borderColor = color;
                        actualTable.style.borderStyle = style;
                        actualTable.style.borderWidth = width;
                        
                        actualTable.setAttribute('data-border-color', color);
                        actualTable.setAttribute('data-border-style', style);
                        actualTable.setAttribute('data-border-width', width);
                        actualTable.setAttribute('data-alignment', align);
                        
                        actualTable.classList.remove('table-align-left', 'table-align-center', 'table-align-right');
                        actualTable.classList.add(`table-align-${align}`);

                        // Propagate border directly to all td/th cells
                        actualTable.querySelectorAll('td, th').forEach(cell => {
                            cell.style.setProperty('--table-border-color', color);
                            cell.style.setProperty('--table-border-style', style);
                            cell.style.setProperty('--table-border-width', width);
                        });
                    }
                }
                else if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                    const domCell = editor.view.nodeDOM(pos);
                    if (domCell) {
                        const { backgroundColor, padding } = node.attrs;
                        if (backgroundColor) {
                            domCell.style.backgroundColor = backgroundColor;
                            domCell.setAttribute('data-background-color', backgroundColor);
                        } else {
                            domCell.style.backgroundColor = '';
                            domCell.removeAttribute('data-background-color');
                        }
                        if (padding) {
                            domCell.style.padding = padding;
                            domCell.setAttribute('data-padding', padding);
                        } else {
                            domCell.style.padding = '';
                            domCell.removeAttribute('data-padding');
                        }
                    }
                }
            });
        },

        // ── Legacy AST selection helpers ──────────────────────────────────────
        getSelection: function () {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            const anchor = findNodeIdAndOffset(sel.anchorNode, sel.anchorOffset);
            const focus  = findNodeIdAndOffset(sel.focusNode,  sel.focusOffset);
            if (!anchor || !focus) return null;
            return { anchorNodeId: anchor.id, anchorOffset: anchor.offset,
                     focusNodeId:  focus.id,  focusOffset:  focus.offset };
        },

        setSelection: function (anchorId, anchorOffset, focusId, focusOffset) {
            setDomSelection(anchorId, anchorOffset, focusId, focusOffset);
        },

        // ── HTML → AST (for Markdown export) ─────────────────────────────────
        htmlToAst: function (htmlString) {
            const parser = new DOMParser();
            const doc    = parser.parseFromString(htmlString || '', 'text/html');
            const root   = { $type: 'element', type: 'root', children: [], attributes: {} };

            for (let child of doc.body.childNodes) {
                const node = parseDomNode(child);
                if (node) Array.isArray(node) ? root.children.push(...node) : root.children.push(node);
            }

            // Flatten nested arrays and drop bare text nodes at root level
            const flat = [];
            root.children.forEach(c => Array.isArray(c) ? flat.push(...c) : flat.push(c));
            root.children = flat.filter(c => c && c.$type !== 'text');

            if (root.children.length === 0) {
                root.children.push({ $type: 'element', type: 'paragraph',
                                     children: [{ $type: 'text', text: '' }], attributes: {} });
            }
            return JSON.stringify(root);
        },

        // ── Legacy custom-editor init (no longer used, kept for safety) ───────
        init: function (element, dotNetHelper) {
            element.addEventListener('input', function () {
                const selObj = window.getSelection();
                if (!selObj || selObj.rangeCount === 0) return;
                const node = findNodeIdAndOffset(selObj.anchorNode, selObj.anchorOffset);
                if (node) {
                    const span = document.querySelector(`[data-node-id="${node.id}"]`);
                    if (span) {
                        let text = span.textContent;
                        if (text.startsWith('\u200B') && text.length > 1) { text = text.substring(1); node.offset = Math.max(0, node.offset - 1); }
                        dotNetHelper.invokeMethodAsync('OnTextInput', node.id, text, node.offset);
                    }
                }
            });
            element.addEventListener('keydown', function (e) {
                const map = { 'Enter': 'Enter', 'Backspace': 'Backspace' };
                if (map[e.key]) { e.preventDefault(); dotNetHelper.invokeMethodAsync('OnKeyDownCommand', map[e.key]); }
                else if (e.ctrlKey && e.key === 'b') { e.preventDefault(); dotNetHelper.invokeMethodAsync('OnKeyDownCommand', 'bold'); }
                else if (e.ctrlKey && e.key === 'i') { e.preventDefault(); dotNetHelper.invokeMethodAsync('OnKeyDownCommand', 'italic'); }
                else if (e.ctrlKey && e.key === 'u') { e.preventDefault(); dotNetHelper.invokeMethodAsync('OnKeyDownCommand', 'underline'); }
            });
            document.addEventListener('selectionchange', function () {
                if (isInteractingWithToolbar) return;
                if (document.activeElement === element || element.contains(document.activeElement)) {
                    const sel = window.editorInterop.getSelection();
                    if (sel) dotNetHelper.invokeMethodAsync('OnSelectionChange', sel.anchorNodeId, sel.anchorOffset, sel.focusNodeId, sel.focusOffset);
                }
            });
        },

        // ═══════════════════════════════════════════════════════════════════════
        //  Tiptap integration (Modern, ProseMirror-based, customizable)
        // ═══════════════════════════════════════════════════════════════════════
        initQuill: async function (elementSelector, dotNetHelper, initialValue) {
            logDiag('[initQuill] Starting initialization for selector: ' + elementSelector);
            // Destroy any previous instance
            window.editorInterop.destroyQuill();

            const container = document.querySelector(elementSelector);
            if (!container) {
                console.error('[editorInterop] Tiptap target not found:', elementSelector);
                return;
            }
            container.innerHTML = '';

            // Load Tiptap dynamically from CDN (esm.sh)
            if (!window.TiptapModules) {
                try {
                    const [
                        { Editor, Node, mergeAttributes },
                        StarterKit,
                        Underline,
                        Link,
                        Image,
                        Highlight,
                        Color,
                        TextStyle,
                        FontFamily,
                        TextAlign,
                        Table,
                        TableRow,
                        TableCell,
                        TableHeader,
                        Subscript,
                        Superscript,
                        TaskList,
                        TaskItem
                    ] = await Promise.all([
                        import('https://esm.sh/@tiptap/core@2.2.4'),
                        import('https://esm.sh/@tiptap/starter-kit@2.2.4').then(m => m.StarterKit || m.default || m),
                        import('https://esm.sh/@tiptap/extension-underline@2.2.4').then(m => m.Underline || m.default || m),
                        import('https://esm.sh/@tiptap/extension-link@2.2.4').then(m => m.Link || m.default || m),
                        import('https://esm.sh/@tiptap/extension-image@2.2.4').then(m => m.Image || m.default || m),
                        import('https://esm.sh/@tiptap/extension-highlight@2.2.4').then(m => m.Highlight || m.default || m),
                        import('https://esm.sh/@tiptap/extension-color@2.2.4').then(m => m.Color || m.default || m),
                        import('https://esm.sh/@tiptap/extension-text-style@2.2.4').then(m => m.TextStyle || m.default || m),
                        import('https://esm.sh/@tiptap/extension-font-family@2.2.4').then(m => m.FontFamily || m.default || m),
                        import('https://esm.sh/@tiptap/extension-text-align@2.2.4').then(m => m.TextAlign || m.default || m),
                        import('https://esm.sh/@tiptap/extension-table@2.2.4').then(m => m.Table || m.default || m),
                        import('https://esm.sh/@tiptap/extension-table-row@2.2.4').then(m => m.TableRow || m.default || m),
                        import('https://esm.sh/@tiptap/extension-table-cell@2.2.4').then(m => m.TableCell || m.default || m),
                        import('https://esm.sh/@tiptap/extension-table-header@2.2.4').then(m => m.TableHeader || m.default || m),
                        import('https://esm.sh/@tiptap/extension-subscript@2.2.4').then(m => m.Subscript || m.default || m),
                        import('https://esm.sh/@tiptap/extension-superscript@2.2.4').then(m => m.Superscript || m.default || m),
                        import('https://esm.sh/@tiptap/extension-task-list@2.2.4').then(m => m.TaskList || m.default || m),
                        import('https://esm.sh/@tiptap/extension-task-item@2.2.4').then(m => m.TaskItem || m.default || m)
                    ]);

                    window.TiptapModules = {
                        Editor, Node, StarterKit, Underline, Link, Image, Highlight,
                        Color, TextStyle, FontFamily, TextAlign, Table, TableRow, TableCell, TableHeader,
                        Subscript, Superscript, TaskList, TaskItem, mergeAttributes
                    };
                    // Stash Node globally so custom extensions always have access
                    window._TiptapNode = Node;
                } catch (err) {
                    console.error('Failed to load Tiptap from CDN:', err);
                    container.innerHTML = `<div style="padding: 20px; color: #ef4444; border: 1px solid #fca5a5; background: #fef2f2; border-radius: 6px; font-family: sans-serif; margin: 20px;">
                        <strong>[editorInterop] Failed to initialize Tiptap:</strong><br>
                        ${err.message || err}<br><br>
                        <em>Stack:</em><br>
                        <pre style="margin-top: 10px; font-size: 0.85rem; white-space: pre-wrap;">${err.stack || ''}</pre>
                    </div>`;
                    return;
                }
            }

            const m = window.TiptapModules;
            const mergeAttributes = m.mergeAttributes;

            // Custom Image extension with resizing and alignment
            const CustomImage = m.Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        width: {
                            default: '100%',
                            parseHTML: element => element.style.width || element.getAttribute('width') || '100%'
                        },
                        alignment: {
                            default: 'center',
                            parseHTML: element => {
                                if (element.style.float === 'left') return 'left';
                                if (element.style.float === 'right') return 'right';
                                if (element.style.margin && element.style.margin.includes('auto')) return 'center';
                                return element.getAttribute('data-alignment') || 'center';
                            }
                        }
                    };
                },
                renderHTML({ HTMLAttributes }) {
                    const width = HTMLAttributes.width || '100%';
                    const align = HTMLAttributes.alignment || 'center';
                    
                    let margin = '1rem 0';
                    let float = 'none';
                    let display = 'block';
                    
                    if (align === 'center') {
                        margin = '1rem auto';
                    } else if (align === 'left') {
                        margin = '1rem auto 1rem 0';
                        float = 'left';
                        display = 'inline-block';
                    } else if (align === 'right') {
                        margin = '1rem 0 1rem auto';
                        float = 'right';
                        display = 'inline-block';
                    }
                    
                    const style = `display: ${display}; margin: ${margin}; float: ${float}; width: ${width}; max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #cbd5e1; cursor: pointer;`;
                    
                    const { alignment, ...rest } = HTMLAttributes;
                    return ['img', mergeAttributes(
                        rest,
                        {
                            style,
                            'data-alignment': align
                        }
                    )];
                }
            });

            // Custom Video extension
            const _Node = window._TiptapNode || m.Node;
            const CustomVideo = _Node.create({
                name: 'video',
                group: 'block',
                selectable: true,
                draggable: true,
                atom: true,
                addAttributes() {
                    return {
                        src: {
                            default: null,
                        },
                        width: {
                            default: '100%',
                        },
                    };
                },
                parseHTML() {
                    return [
                        {
                            tag: 'iframe[src]',
                            getAttrs: dom => ({
                                src: dom.getAttribute('src'),
                                width: dom.getAttribute('width') || '100%'
                            })
                        },
                        {
                            tag: 'video[src]',
                            getAttrs: dom => ({
                                src: dom.getAttribute('src'),
                                width: dom.getAttribute('width') || '100%'
                            })
                        }
                    ];
                },
                renderHTML({ HTMLAttributes }) {
                    const src = HTMLAttributes.src || '';
                    if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com') || src.includes('player.vimeo.com')) {
                        let embedUrl = src;
                        if (src.includes('youtube.com/watch?v=')) {
                            const videoId = src.split('v=')[1]?.split('&')[0];
                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                        } else if (src.includes('youtu.be/')) {
                            const videoId = src.split('youtu.be/')[1]?.split('?')[0];
                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                        }
                        return ['div', { class: 'video-wrapper', style: 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1.5rem 0;' },
                            ['iframe', {
                                src: embedUrl,
                                width: HTMLAttributes.width || '100%',
                                style: 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;',
                                allowfullscreen: 'true',
                                frameborder: '0'
                            }]
                        ];
                    }
                    return ['video', {
                        src: src,
                        controls: 'true',
                        width: HTMLAttributes.width || '100%',
                        style: 'max-width: 100%; margin: 1.5rem 0; display: block; border-radius: 8px;'
                    }];
                }
            });

            // Custom PageBreak extension
            const PageBreak = _Node.create({
                name: 'pageBreak',
                group: 'block',
                selectable: true,
                draggable: true,
                atom: true,
                parseHTML() {
                    return [
                        { tag: 'hr.page-break' },
                        { tag: 'div.page-break' }
                    ];
                },
                renderHTML() {
                    return ['div', { class: 'page-break' }];
                },
                addKeyboardShortcuts() {
                    return {
                        // Ctrl+Enter inserts a page break
                        'Mod-Enter': () => {
                            const { state } = this.editor;
                            const { selection } = state;
                            // If inside a table, insert AFTER the table
                            if (this.editor.isActive('table')) {
                                const { dispatch, state: s } = this.editor.view;
                                const $from = s.selection.$from;
                                let tableDepth = -1;
                                for (let d = $from.depth; d > 0; d--) {
                                    if ($from.node(d).type.name === 'table') { tableDepth = d; break; }
                                }
                                if (tableDepth > -1) {
                                    const tableEnd = $from.after(tableDepth);
                                    const tr = s.tr.insert(tableEnd, [
                                        s.schema.nodes.paragraph.create(),
                                        s.schema.nodes.pageBreak.create(),
                                        s.schema.nodes.paragraph.create()
                                    ]);
                                    dispatch(tr);
                                    return true;
                                }
                            }
                            return this.editor.chain().insertContent({ type: 'pageBreak' }).run();
                        },
                    };
                }
            });

            // Custom Table extension to support border color, style, width, alignment
            const CustomTable = m.Table.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        borderColor: {
                            default: '#94a3b8',
                            parseHTML: element => element.style.borderColor || element.getAttribute('data-border-color') || '#94a3b8'
                        },
                        borderWidth: {
                            default: '2px',
                            parseHTML: element => element.style.borderWidth || element.getAttribute('data-border-width') || '2px'
                        },
                        borderStyle: {
                            default: 'solid',
                            parseHTML: element => element.style.borderStyle || element.getAttribute('data-border-style') || 'solid'
                        },
                        alignment: {
                            default: 'center',
                            parseHTML: element => element.getAttribute('data-alignment') || 'center'
                        }
                    };
                },
                renderHTML({ node, HTMLAttributes }) {
                    const { borderColor, borderWidth, borderStyle, alignment } = node.attrs;
                    const style = `--table-border-color: ${borderColor || '#94a3b8'}; --table-border-style: ${borderStyle || 'solid'}; --table-border-width: ${borderWidth || '2px'}; border-color: ${borderColor || '#94a3b8'}; border-style: ${borderStyle || 'solid'}; border-width: ${borderWidth || '2px'};`;
                    
                    return ['table', mergeAttributes(
                        HTMLAttributes,
                        {
                            style,
                            class: `table-align-${alignment || 'center'}`,
                            'data-border-color': borderColor,
                            'data-border-style': borderStyle,
                            'data-border-width': borderWidth,
                            'data-alignment': alignment
                        }
                    ), ['tbody', 0]];
                }
            });

            const CustomTableCell = m.TableCell.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        backgroundColor: {
                            default: null,
                            parseHTML: element => element.style.backgroundColor || element.getAttribute('data-background-color') || null
                        },
                        padding: {
                            default: null,
                            parseHTML: element => element.style.padding || element.getAttribute('data-padding') || null
                        }
                    };
                },
                renderHTML({ node, HTMLAttributes }) {
                    const { backgroundColor, padding } = node.attrs;
                    let style = 'border: var(--table-border-width, 2px) var(--table-border-style, solid) var(--table-border-color, #cbd5e1);';
                    if (backgroundColor) style += ` background-color: ${backgroundColor};`;
                    if (padding) style += ` padding: ${padding};`;
                    return ['td', mergeAttributes(
                        HTMLAttributes,
                        {
                            style,
                            'data-background-color': backgroundColor,
                            'data-padding': padding
                        }
                    ), 0];
                }
            });

            const CustomTableHeader = m.TableHeader.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        backgroundColor: {
                            default: null,
                            parseHTML: element => element.style.backgroundColor || element.getAttribute('data-background-color') || null
                        },
                        padding: {
                            default: null,
                            parseHTML: element => element.style.padding || element.getAttribute('data-padding') || null
                        }
                    };
                },
                renderHTML({ node, HTMLAttributes }) {
                    const { backgroundColor, padding } = node.attrs;
                    let style = 'border: var(--table-border-width, 2px) var(--table-border-style, solid) var(--table-border-color, #cbd5e1); font-weight: 700; background-color: #f1f5f9;';
                    if (backgroundColor) style += ` background-color: ${backgroundColor};`;
                    if (padding) style += ` padding: ${padding};`;
                    return ['th', mergeAttributes(
                        HTMLAttributes,
                        {
                            style,
                            'data-background-color': backgroundColor,
                            'data-padding': padding
                        }
                    ), 0];
                }
            });

            const editor = new m.Editor({
                element: container,
                extensions: [
                    m.StarterKit,
                    m.Underline,
                    m.Link.configure({ openOnClick: false }),
                    CustomImage,
                    CustomVideo,
                    PageBreak,
                    m.Highlight.configure({ multicolor: true }),
                    m.Color,
                    m.TextStyle,
                    m.FontFamily,
                    m.TextAlign.configure({ types: ['heading', 'paragraph'] }),
                    CustomTable.configure({ resizable: true }),
                    m.TableRow,
                    CustomTableCell,
                    CustomTableHeader,
                    m.Subscript,
                    m.Superscript,
                    m.TaskList,
                    m.TaskItem.configure({ nested: true })
                ],
                content: initialValue || '<p></p>',
                onUpdate: ({ editor }) => {
                    const html = editor.getHTML();
                    dotNetHelper.invokeMethodAsync('OnEditorContentChanged', html);
                    window.editorInterop.updateActiveStates(editor);
                    window.editorInterop.updateCurrentPageFromSelection(editor);
                    window.editorInterop.syncAllTablesStyles(editor);
                    
                    if (window._splitTimeout) clearTimeout(window._splitTimeout);
                    window._splitTimeout = setTimeout(() => {
                        window.editorInterop.checkAndSplitTables();
                        window.editorInterop.updateCurrentPageFromSelection(editor);
                        window.editorInterop.syncAllTablesStyles(editor);
                    }, 1000);
                },
                onSelectionUpdate: ({ editor }) => {
                    window.editorInterop.updateActiveStates(editor);
                    window.editorInterop.updateCurrentPageFromSelection(editor);
                    window.editorInterop.syncAllTablesStyles(editor);
                }
            });

            window.tiptapInstance = editor;
            window.quillDotNet = dotNetHelper;
            
            // Focus editor when clicking the blank spaces of the editor container
            container.addEventListener('click', (e) => {
                if (e.target === container || e.target.id === 'cke5-feature-rich-demo') {
                    editor.commands.focus();
                }
            });

            // ── Ctrl + Mousewheel Zoom on workspace ──
            const workspace = document.querySelector('.rte-document-scroll');
            if (workspace) {
                if (window._oldWorkspaceWheel) {
                    workspace.removeEventListener('wheel', window._oldWorkspaceWheel);
                }
                window._oldWorkspaceWheel = (e) => {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        const dir = e.deltaY < 0 ? 1 : -1;
                        let newZoom = window.editorInterop.zoomFactor + dir * 0.05;
                        window.editorInterop.setZoom(newZoom);
                    }
                };
                workspace.addEventListener('wheel', window._oldWorkspaceWheel, { passive: false });

                // ── Pinch to Zoom ──
                let initialDistance = 0;
                let initialZoom = 1.0;
                workspace.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        initialDistance = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        initialZoom = window.editorInterop.zoomFactor;
                    }
                });

                workspace.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2 && initialDistance > 0) {
                        e.preventDefault();
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        const factor = dist / initialDistance;
                        let newZoom = initialZoom * factor;
                        window.editorInterop.setZoom(newZoom);
                    }
                });

                workspace.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2) {
                        initialDistance = 0;
                    }
                });
            }

            // ── Drag & Drop local files (Base64 conversion) ──
            const editorEl = container.querySelector('.ProseMirror') || container;
            editorEl.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            editorEl.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    let hasImages = false;
                    for (let i = 0; i < files.length; i++) {
                        if (files[i].type.startsWith('image/')) {
                            hasImages = true;
                            break;
                        }
                    }
                    if (hasImages) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            if (file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const base64Url = event.target.result;
                                    editor.chain().focus().setImage({ src: base64Url, alt: file.name }).run();
                                    logDiag('Dropped local image inserted as Base64');
                                };
                                reader.readAsDataURL(file);
                            }
                        }
                    }
                }
            });

            // Let the DOM update, then sync initial active states, page counts, and table styles
            setTimeout(() => {
                window.editorInterop.updateActiveStates(editor);
                window.editorInterop.updateCurrentPageFromSelection(editor);
                window.editorInterop.syncAllTablesStyles(editor);
                if (window.tablePanel) window.tablePanel.init();
            }, 100);
        },

        destroyQuill: function () {
            if (window.tiptapInstance) {
                try {
                    window.tiptapInstance.destroy();
                } catch (e) { /* ignore */ }
                window.tiptapInstance = null;
                window.quillDotNet = null;
            }
        },

        getQuillHtml: function () {
            if (!window.tiptapInstance) return '';
            return window.tiptapInstance.getHTML();
        },

        execute: function (command, value) {
            logDiag('[execute] command: ' + command + (value ? ' with value: ' + value : ''));
            if (!window.tiptapInstance) {
                logDiag('[execute] ERROR: window.tiptapInstance is null/undefined!', '#f87171');
                return;
            }
            const editor = window.tiptapInstance;

            switch (command) {
                case 'bold': editor.chain().focus().toggleBold().run(); break;
                case 'italic': editor.chain().focus().toggleItalic().run(); break;
                case 'underline': editor.chain().focus().toggleUnderline().run(); break;
                case 'strike': editor.chain().focus().toggleStrike().run(); break;
                case 'code-block': editor.chain().focus().toggleCodeBlock().run(); break;
                case 'color': editor.chain().focus().setColor(value).run(); break;
                case 'highlight': editor.chain().focus().toggleHighlight({ color: value }).run(); break;
                case 'align': editor.chain().focus().setTextAlign(value).run(); break;
                case 'bulletList': editor.chain().focus().toggleBulletList().run(); break;
                case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break;
                case 'subscript': editor.chain().focus().toggleSubscript().run(); break;
                case 'superscript': editor.chain().focus().toggleSuperscript().run(); break;
                case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
                case 'horizontalRule': editor.chain().focus().setHorizontalRule().run(); break;
                case 'taskList': editor.chain().focus().toggleTaskList().run(); break;
                case 'insertImage':
                    const imgUrl = prompt("Enter image URL:", "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80");
                    if (imgUrl) {
                        const imgAlt = prompt("Enter image alt text:", "Workspace Image");
                        editor.chain().focus().setImage({ src: imgUrl, alt: imgAlt }).run();
                    }
                    break;
                case 'image-align':
                    editor.chain().focus().updateAttributes('image', { alignment: value }).run();
                    break;
                case 'image-resize':
                    editor.chain().focus().updateAttributes('image', { width: value }).run();
                    break;
                case 'image-alt':
                    const currentAlt = editor.getAttributes('image').alt || '';
                    const newAlt = prompt("Enter image alt text:", currentAlt);
                    if (newAlt !== null) {
                        editor.chain().focus().updateAttributes('image', { alt: newAlt }).run();
                    }
                    break;
                case 'image-delete':
                    editor.chain().focus().deleteSelection().run();
                    break;
                case 'insertTable':
                    if (window.editorInterop.isSelectionInTable(editor)) {
                        logDiag('[execute] Prevented nested table insertion');
                        alert("Inserting nested tables is not allowed.");
                        break;
                    }
                    // Default to 3x3 table without prompts
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    break;
                case 'insertTableWithAttrs':
                    if (window.editorInterop.isSelectionInTable(editor)) {
                        logDiag('[execute] Prevented nested table insertion');
                        alert("Inserting nested tables is not allowed.");
                        break;
                    }
                    editor.chain().focus().insertTable({ rows: value.rows, cols: value.cols, withHeaderRow: true }).run();
                    setTableAttribute(editor, { 
                        borderColor: value.borderColor,
                        borderWidth: value.borderWidth || '2px',
                        borderStyle: value.borderStyle || 'solid',
                        alignment: value.alignment || 'center'
                    });
                    break;
                case 'setTableBorderColor':
                    if (!window.editorInterop.isSelectionInTable(editor)) {
                        alert("Please click inside a table to change its border color.");
                        break;
                    }
                    setTableAttribute(editor, { borderColor: value });
                    break;
                case 'setCellBackgroundColor':
                    if (!window.editorInterop.isSelectionInTable(editor)) {
                        alert("Please click inside a table cell to apply background color.");
                        break;
                    }
                    setCellAttribute(editor, 'backgroundColor', value);
                    break;
                case 'setCellPadding':
                    if (!window.editorInterop.isSelectionInTable(editor)) {
                        alert("Please click inside a table cell to change padding.");
                        break;
                    }
                    setCellAttribute(editor, 'padding', value);
                    break;
                case 'setTableAttributes':
                    if (!window.editorInterop.isSelectionInTable(editor)) {
                        alert("Please click inside a table to modify settings.");
                        break;
                    }
                    setTableAttribute(editor, {
                        borderColor: value.borderColor,
                        borderWidth: value.borderWidth,
                        borderStyle: value.borderStyle,
                        alignment: value.alignment
                    });
                    break;
                case 'mergeAdjacentTables':
                    window.editorInterop.mergeAdjacentTables();
                    break;
                case 'insertBase64Image':
                    editor.chain().focus().setImage({ src: value }).run();
                    break;
                case 'addColumnBefore': editor.chain().focus().addColumnBefore().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'addColumnAfter': editor.chain().focus().addColumnAfter().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'deleteColumn': editor.chain().focus().deleteColumn().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'addRowBefore': editor.chain().focus().addRowBefore().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'addRowAfter': editor.chain().focus().addRowAfter().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'deleteRow': editor.chain().focus().deleteRow().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'deleteTable': editor.chain().focus().deleteTable().run(); break;
                case 'mergeCells': editor.chain().focus().mergeCells().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'splitCell': editor.chain().focus().splitCell().run(); window.editorInterop.syncAllTablesStyles(editor); break;
                case 'insertVideo':
                    const videoUrl = prompt("Enter video URL (YouTube, Vimeo, or raw mp4):", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
                    if (videoUrl) {
                        editor.chain().focus().insertContent({
                            type: 'video',
                            attrs: { src: videoUrl }
                        }).run();
                    }
                    break;
                case 'pageBreak':
                    if (window.editorInterop.isSelectionInTable(editor)) {
                        const { state, dispatch } = editor.view;
                        const { selection } = state;
                        let tableDepth = -1;
                        for (let d = selection.$from.depth; d > 0; d--) {
                            if (selection.$from.node(d).type.name === 'table') {
                                tableDepth = d;
                                break;
                            }
                        }
                        if (tableDepth > -1) {
                            const tableEnd = selection.$from.after(tableDepth);
                            const tr = state.tr.insert(tableEnd, [
                                state.schema.nodes.paragraph.create(),
                                state.schema.nodes.pageBreak.create(),
                                state.schema.nodes.paragraph.create()
                            ]);
                            dispatch(tr);
                            setTimeout(() => {
                                editor.commands.focus(tableEnd + 3);
                            }, 50);
                            break;
                        }
                    }
                    editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
                    break;
                case 'movePage':
                    window.editorInterop.movePage(value);
                    break;
                case 'insertText':
                    editor.chain().focus().insertContent(value).run();
                    break;
                case 'undo': editor.chain().focus().undo().run(); break;
                case 'redo': editor.chain().focus().redo().run(); break;
                case 'code': editor.chain().focus().toggleCode().run(); break;
                case 'link':
                    const currentUrl = editor.getAttributes('link').href || '';
                    const url = prompt('Enter URL:', currentUrl);
                    if (url === null) break;
                    if (url === '') {
                        editor.chain().focus().unsetLink().run();
                    } else {
                        editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
                    }
                    break;
                case 'clearFormatting':
                    editor.chain().focus().clearNodes().unsetAllMarks().run();
                    break;
                case 'print':
                    window.print();
                    break;
            }
        },

        setHeading: function (level) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            if (level === 'p') {
                editor.chain().focus().setParagraph().run();
            } else {
                editor.chain().focus().toggleHeading({ level: parseInt(level, 10) }).run();
            }
        },

        setFont: function (fontName) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            if (fontName === 'sans-serif' || fontName === 'serif' || fontName === 'monospace') {
                editor.chain().focus().unsetFontFamily().run();
            } else {
                editor.chain().focus().setFontFamily(fontName).run();
            }
        },

        setFontSize: function (size) {
            if (!window.tiptapInstance || !size) return;
            const editor = window.tiptapInstance;
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        },

        setLineHeight: function (lineHeight) {
            if (!window.tiptapInstance || !lineHeight) return;
            const editor = window.tiptapInstance;
            // Apply line-height via textStyle if the extension supports it
            try {
                editor.chain().focus().setMark('textStyle', { lineHeight: lineHeight }).run();
            } catch (e) {
                // Fallback: apply via DOM style on selected paragraph nodes
                const { state } = editor;
                const { from, to } = state.selection;
                editor.view.dom.querySelectorAll('p, h1, h2, h3, h4, li').forEach(el => {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        if (el.contains(range.commonAncestorContainer)) {
                            el.style.lineHeight = lineHeight;
                        }
                    }
                });
            }
        },

        updateActiveStates: function (editor) {
            // Text formats
            const formats = ['bold', 'italic', 'underline', 'strike', 'codeBlock', 'subscript', 'superscript'];
            formats.forEach(f => {
                const btn = document.querySelector(`[data-action="${f}"]`) || document.querySelector(`[data-action="${f.toLowerCase()}"]`);
                if (btn) btn.classList.toggle('active', editor.isActive(f));
            });

            // Alignment formats
            const alignments = ['left', 'center', 'right', 'justify'];
            alignments.forEach(align => {
                const btn = document.querySelector(`[data-action="align-${align}"]`);
                if (btn) btn.classList.toggle('active', editor.isActive({ textAlign: align }));
            });

            // Lists formats
            const btnBullet = document.querySelector('[data-action="bulletList"]');
            if (btnBullet) btnBullet.classList.toggle('active', editor.isActive('bulletList'));
            const btnOrdered = document.querySelector('[data-action="orderedList"]');
            if (btnOrdered) btnOrdered.classList.toggle('active', editor.isActive('orderedList'));
            const btnTask = document.querySelector('[data-action="taskList"]');
            if (btnTask) btnTask.classList.toggle('active', editor.isActive('taskList'));
            const btnBlockquote = document.querySelector('[data-action="blockquote"]');
            if (btnBlockquote) btnBlockquote.classList.toggle('active', editor.isActive('blockquote'));

            // Table toolbar toggle
            const tableTools = document.querySelector('#tiptap-table-tools');
            if (tableTools) {
                const isInsideTable = editor.isActive('table');
                tableTools.style.display = isInsideTable ? 'flex' : 'none';
            }

            // Image toolbar toggle
            const imageTools = document.querySelector('#tiptap-image-tools');
            if (imageTools) {
                const isImageSelected = editor.isActive('image');
                imageTools.style.display = isImageSelected ? 'flex' : 'none';
            }
        },

        uploadLocalImage: function (fileInput) {
            if (!fileInput.files || !fileInput.files[0]) return;
            const file = fileInput.files[0];
            
            logDiag('Converting image to Base64 (byte data): ' + file.name);
            
            const reader = new FileReader();
            reader.onload = function (e) {
                const dataUrl = e.target.result;
                if (window.tiptapInstance) {
                    window.tiptapInstance.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
                    logDiag('Inserted image as Base64');
                }
            };
            reader.readAsDataURL(file);
            
            fileInput.value = '';
        },

        mergeAdjacentTables: function () {
            logDiag('[mergeAdjacentTables] Attempting to merge tables');
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const { state } = editor;
            const { selection } = state;
            
            let tablePos = null;
            let tableNode = null;
            
            state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                if (node.type.name === 'table') {
                    tablePos = pos;
                    tableNode = node;
                    return false;
                }
            });
            
            if (tablePos === null) {
                alert("Please click inside a table to merge.");
                return;
            }
            
            // 1. Look for a table AFTER this one
            const nextNodePos = tablePos + tableNode.nodeSize;
            let targetTable = null;
            let targetPos = null;
            let mergeAfter = true;
            
            if (nextNodePos < state.doc.content.size) {
                const directNext = state.doc.nodeAt(nextNodePos);
                if (directNext && directNext.type.name === 'table') {
                    targetTable = directNext;
                    targetPos = nextNodePos;
                    mergeAfter = true;
                }
            }
            
            // If not found after, search for table BEFORE this one (backward search)
            if (!targetTable) {
                state.doc.nodesBetween(0, tablePos, (node, pos) => {
                    if (node.type.name === 'table' && pos + node.nodeSize === tablePos) {
                        targetTable = node;
                        targetPos = pos;
                        mergeAfter = false;
                    }
                });
            }
            
            if (!targetTable) {
                alert("No adjacent table found directly before or after the current table.");
                return;
            }
            
            // Helper to compute column count from table JSON
            function getTableColCountJson(tableJson) {
                let maxCols = 0;
                if (!tableJson || !tableJson.content) return 0;
                tableJson.content.forEach(row => {
                    let rowCols = 0;
                    if (row && row.content) {
                        row.content.forEach(cell => {
                            const colspan = (cell.attrs && cell.attrs.colspan) || 1;
                            rowCols += colspan;
                        });
                    }
                    if (rowCols > maxCols) {
                        maxCols = rowCols;
                    }
                });
                return maxCols;
            }
            
            // Helper to pad table rows to matching columns count
            function padTableRowsJson(tableJson, targetCols) {
                if (!tableJson || !tableJson.content) return;
                tableJson.content.forEach(row => {
                    let rowCols = 0;
                    if (row && row.content) {
                        row.content.forEach(cell => {
                            const colspan = (cell.attrs && cell.attrs.colspan) || 1;
                            rowCols += colspan;
                        });
                        while (rowCols < targetCols) {
                            row.content.push({
                                type: "tableCell",
                                attrs: {
                                    colspan: 1,
                                    rowspan: 1,
                                    colwidth: null,
                                    backgroundColor: null
                                },
                                content: [
                                    {
                                        type: "paragraph"
                                    }
                                ]
                            });
                            rowCols += 1;
                        }
                    }
                });
            }
            
            const fromPos = Math.min(tablePos, targetPos);
            const toPos = Math.max(tablePos + tableNode.nodeSize, targetPos + targetTable.nodeSize);
            
            // Convert both tables to JSON
            const tableNodeJson = tableNode.toJSON();
            const targetTableJson = targetTable.toJSON();
            
            // Find target columns
            const colsA = getTableColCountJson(tableNodeJson);
            const colsB = getTableColCountJson(targetTableJson);
            const targetCols = Math.max(colsA, colsB);
            
            // Pad both tables
            padTableRowsJson(tableNodeJson, targetCols);
            padTableRowsJson(targetTableJson, targetCols);
            
            // Merge rows
            let mergedRows = [];
            if (mergeAfter) {
                mergedRows = [...tableNodeJson.content, ...targetTableJson.content];
            } else {
                mergedRows = [...targetTableJson.content, ...tableNodeJson.content];
            }
            
            const mergedTableJson = {
                type: "table",
                attrs: mergeAfter ? tableNodeJson.attrs : targetTableJson.attrs,
                content: mergedRows
            };
            
            editor.chain()
                .focus()
                .deleteRange({ from: fromPos, to: toPos })
                .insertContentAt(fromPos, mergedTableJson)
                .run();
                
            logDiag('Tables successfully merged.');
        },

        movePage: function (direction) {
            logDiag(`[movePage] Moving page ${direction}`);
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const { state } = editor;
            const { doc, selection } = state;
            
            // 1. Group the top-level block nodes into pages
            const pages = [];
            let currentPage = [];
            
            doc.forEach((node, offset) => {
                if (node.type.name === 'pageBreak') {
                    pages.push({
                        nodes: currentPage,
                        hasBreakAfter: true
                    });
                    currentPage = [];
                } else {
                    currentPage.push({ node, offset, size: node.nodeSize });
                }
            });
            pages.push({
                nodes: currentPage,
                hasBreakAfter: false
            });
            
            // 2. Find which page contains the current selection
            const selPos = selection.from;
            let currentPageIndex = -1;
            
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                if (page.nodes.length === 0) {
                    // Empty page or page with only a pageBreak
                    continue;
                }
                const pageStart = page.nodes[0].offset;
                const lastNode = page.nodes[page.nodes.length - 1];
                const pageEnd = lastNode.offset + lastNode.size;
                
                if (selPos >= pageStart && selPos <= pageEnd + 1) {
                    currentPageIndex = i;
                    break;
                }
            }
            
            // Fallback to last page if selection is at the end of the document
            if (currentPageIndex === -1 && pages.length > 0) {
                currentPageIndex = pages.length - 1;
            }
            
            logDiag(`Current page index: ${currentPageIndex} of ${pages.length}`);
            
            // 3. Determine target page index to swap with
            let targetPageIndex = -1;
            if (direction === 'up' || direction === 'front') {
                targetPageIndex = currentPageIndex - 1;
            } else if (direction === 'down' || direction === 'back') {
                targetPageIndex = currentPageIndex + 1;
            }
            
            if (targetPageIndex < 0 || targetPageIndex >= pages.length) {
                logDiag('Cannot move page further in this direction');
                return;
            }
            
            // Swap pages
            const temp = pages[currentPageIndex];
            pages[currentPageIndex] = pages[targetPageIndex];
            pages[targetPageIndex] = temp;
            
            // Re-normalize page break flags
            for (let i = 0; i < pages.length; i++) {
                pages[i].hasBreakAfter = (i < pages.length - 1);
            }
            
            // 4. Construct the new document content JSON
            const newContent = [];
            pages.forEach(page => {
                page.nodes.forEach(n => {
                    newContent.push(n.node.toJSON());
                });
                if (page.hasBreakAfter) {
                    newContent.push({ type: 'pageBreak' });
                }
            });
            
            // 5. Replace entire doc content in a single transaction
            editor.chain().focus().setContent(newContent).run();
            logDiag('Page moved successfully');
        },

        checkAndSplitTables: function () {
            logDiag('[checkAndSplitTables] Auto table-splitting disabled.');
        },

        // Aliases so existing Blazor calls keep working
        initCKEditor:    function (sel, dn, val) { window.editorInterop.initQuill(sel, dn, val); },
        destroyCKEditor: function ()              { window.editorInterop.destroyQuill(); },
        setContent:      function (html)          {
            logDiag('[setContent] Setting editor content...');
            if (window.tiptapInstance) {
                window.tiptapInstance.commands.setContent(html || '<p></p>');
                setTimeout(() => window.editorInterop.syncAllTablesStyles(window.tiptapInstance), 20);
            }
        },

        // Advanced controls: zoom and editable status
        zoomFactor: 1.0,
        setZoom: function (factor) {
            factor = Math.max(0.5, Math.min(2.0, factor));
            window.editorInterop.zoomFactor = factor;
            
            const sheet = document.querySelector('.rte-paper-sheet');
            if (sheet) {
                sheet.style.zoom = factor;
            }
            
            if (window.quillDotNet) {
                window.quillDotNet.invokeMethodAsync('OnZoomChanged', factor);
            }
        },
        setEditable: function (editable) {
            if (window.tiptapInstance) {
                window.tiptapInstance.setEditable(editable);
            }
        }
    };
})();

window.downloadTextFile = function(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.generatePdfFromHtml = function(elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
};
