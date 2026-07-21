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
        cleanCTAHTML: function (html) {
            if (!html) return html;
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 1. Remove empty cta-button elements
                const buttons = doc.querySelectorAll('a.cta-button');
                buttons.forEach(btn => {
                    if (!btn.textContent.trim()) {
                        btn.remove();
                    }
                });

                // 2. Ensure each cta-container has only ONE cta-button
                const containers = doc.querySelectorAll('.cta-container');
                containers.forEach(container => {
                    const btns = container.querySelectorAll('.cta-button');
                    if (btns.length > 1) {
                        // Keep only the first non-empty button, remove others
                        for (let i = 1; i < btns.length; i++) {
                            btns[i].remove();
                        }
                    }
                });

                return doc.body.innerHTML;
            } catch (e) {
                console.error('[cleanCTAHTML] Error:', e);
                return html;
            }
        },

        currentPageIndex: 0,
        totalPagesCount: 1,

        insertWidget: function (type) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            editor.commands.focus();
            
            switch (type) {
                case 'paragraph':
                    editor.chain().focus().insertContent('<p>New Paragraph text.</p>').run();
                    break;
                case 'h1':
                    editor.chain().focus().insertContent('<h1>Heading 1</h1>').run();
                    break;
                case 'h2':
                    editor.chain().focus().insertContent('<h2>Heading 2</h2>').run();
                    break;
                case 'h3':
                    editor.chain().focus().insertContent('<h3>Heading 3</h3>').run();
                    break;
                case 'quote':
                    editor.chain().focus().insertContent('<blockquote>“This is a blockquote.”</blockquote>').run();
                    break;
                case 'divider':
                    editor.chain().focus().setHorizontalRule().run();
                    break;
                case 'patientCardWidget':
                    editor.chain().focus().insertContent('<div class="patient-card-widget" data-patient-name="John Doe" data-patient-age="45" data-patient-gender="Male" data-uhid="UHID-982341" data-blood-group="O+" data-doctor-name="Dr. Sarah Jenkins" data-department="Cardiology" data-visit-date="2026-07-07"></div><p></p>').run();
                    break;
                case 'vitalsWidget':
                    editor.chain().focus().insertContent('<div class="vitals-widget" data-bp="120/80" data-pulse="72" data-respiration="16" data-temperature="98.6" data-weight="70" data-height="170" data-bmi="24.2" data-spo2="98"></div><p></p>').run();
                    break;
                case 'prescriptionWidget':
                    editor.chain().focus().insertContent('<div class="prescription-widget" data-medicines=\'[{"name":"Tab. Paracetamol 650mg","morning":"1","afternoon":"1","night":"1","days":"5","notes":"Take after meals"}]\'></div><p></p>').run();
                    break;
                case 'labReportWidget':
                    editor.chain().focus().insertContent('<div class="lab-report-widget" data-tests=\'[{"name":"Hemoglobin (Hb)","result":"14.2","reference":"13.0 - 17.0","unit":"g/dL","status":"Normal"}]\'></div><p></p>').run();
                    break;
                case 'diagnosisWidget':
                    editor.chain().focus().insertContent('<div class="diagnosis-widget" data-primary-diagnosis="Essential Hypertension" data-secondary-diagnosis="Type 2 Diabetes" data-icd-code="I10" data-clinical-notes="Patient reported mild headache."></div><p></p>').run();
                    break;
                case 'callout':
                    editor.chain().focus().insertContent('<div class="callout-box info"><p><strong>ℹ️ Info Notice</strong></p><p>Enter clinical info details.</p></div><p></p>').run();
                    break;
                case 'cta':
                    editor.chain().focus().insertContent('<div class="cta-container"><span class="cta-text">Do you have any queries? Contact our helpdesk:</span><a href="/contact" class="cta-button">Contact Us</a></div><p></p>').run();
                    break;
                case 'table':
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    break;
                case 'image':
                    window.editorInterop.execute('insertImage');
                    break;
                case 'video':
                    window.editorInterop.execute('insertVideo');
                    break;
                case 'pageBreak':
                    editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
                    break;
                default:
                    console.warn('Unknown widget type: ' + type);
            }
        },

        updateSelectedNodeAttrs: function (attrsJson) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const { selection } = editor.state;
            const attrs = JSON.parse(attrsJson);
            
            if (selection.node) {
                editor.view.dispatch(
                    editor.state.tr.setNodeMarkup(selection.from, undefined, {
                        ...selection.node.attrs,
                        ...attrs
                    })
                );
            } else {
                const { $from } = selection;
                const parentPos = $from.before();
                const parentNode = $from.parent;
                editor.view.dispatch(
                    editor.state.tr.setNodeMarkup(parentPos, undefined, {
                        ...parentNode.attrs,
                        ...attrs
                    })
                );
            }
        },

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

        addFaqItem: function (buttonElement) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const actionsEl = buttonElement.closest('.faq-actions');
            if (actionsEl) {
                const pos = editor.view.posAtDOM(actionsEl);
                if (pos !== undefined && pos !== null) {
                    try {
                        const newFaqItem = {
                            type: 'faqItem',
                            attrs: { open: 'true' },
                            content: [
                                {
                                    type: 'faqQuestion',
                                    content: [{ type: 'text', text: 'Q: New Question?' }]
                                },
                                {
                                    type: 'faqAnswer',
                                    content: [
                                        {
                                            type: 'paragraph',
                                            content: [{ type: 'text', text: 'A: Enter answer here.' }]
                                        }
                                    ]
                                }
                            ]
                        };
                        editor.chain().focus().insertContentAt(pos, newFaqItem).run();
                        logDiag('FAQ item inserted as JSON schema node.');
                    } catch (e) {
                        editor.chain().focus().insertContentAt(pos, `<details class="faq-item" open><summary class="faq-question">Q: New Question?</summary><div class="faq-answer"><p>A: Enter answer here.</p></div></details>`).run();
                        logDiag('FAQ item inserted via fallback HTML: ' + e.message);
                    }
                }
            }
        },

        setCTAContainerColor: function (color) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const { state } = editor;
            const { selection } = state;
            
            let widgetPos = -1;
            const $from = selection.$from;
            if ($from) {
                for (let d = $from.depth; d >= 0; d--) {
                    const node = $from.node(d);
                    if (node && node.type.name === 'ctaWidget') {
                        widgetPos = $from.before(d);
                        break;
                    }
                }
            }
            
            if (widgetPos === -1) {
                state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                    if (node.type.name === 'ctaWidget') {
                        widgetPos = pos;
                        return false;
                    }
                });
            }
            
            if (widgetPos > -1) {
                const node = state.doc.nodeAt(widgetPos);
                editor.view.dispatch(
                    state.tr.setNodeMarkup(widgetPos, undefined, {
                        ...node.attrs,
                        backgroundColor: color
                    })
                );
            } else {
                alert('Please place your cursor inside a Call Action Widget to change its color.');
            }
        },
        setCTACornerRadius: function (radius) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const { state } = editor;
            const { selection } = state;
            
            let widgetPos = -1;
            const $from = selection.$from;
            if ($from) {
                for (let d = $from.depth; d >= 0; d--) {
                    const node = $from.node(d);
                    if (node && node.type.name === 'ctaWidget') {
                        widgetPos = $from.before(d);
                        break;
                    }
                }
            }
            
            if (widgetPos === -1) {
                state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                    if (node.type.name === 'ctaWidget') {
                        widgetPos = pos;
                        return false;
                    }
                });
            }
            
            if (widgetPos > -1) {
                const node = state.doc.nodeAt(widgetPos);
                editor.view.dispatch(
                    state.tr.setNodeMarkup(widgetPos, undefined, {
                        ...node.attrs,
                        borderRadius: radius
                    })
                );
            } else {
                alert('Please place your cursor inside a Call Action Widget to change its corner radius.');
            }
        },

        setCTAButtonColor: function (bgColor, fgColor) {
            if (!window.tiptapInstance) return;
            const editor = window.tiptapInstance;
            const { state } = editor;
            const { selection } = state;
            
            let buttonPos = -1;
            const $from = selection.$from;
            if ($from) {
                for (let d = $from.depth; d >= 0; d--) {
                    const node = $from.node(d);
                    if (node && node.type.name === 'ctaWidget') {
                        node.forEach((child, offset) => {
                            if (child.type.name === 'ctaButton') {
                                buttonPos = $from.start(d) + offset;
                            }
                        });
                        break;
                    } else if (node && node.type.name === 'ctaButton') {
                        buttonPos = $from.before(d);
                        break;
                    }
                }
            }
            
            if (buttonPos === -1) {
                state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                    if (node.type.name === 'ctaButton') {
                        buttonPos = pos;
                        return false;
                    }
                });
            }
            
            if (buttonPos > -1) {
                const node = state.doc.nodeAt(buttonPos);
                const attrs = { ...node.attrs };
                if (bgColor !== undefined && bgColor !== null) {
                    attrs.backgroundColor = bgColor;
                    if (fgColor === null || fgColor === undefined) {
                        if (bgColor.startsWith('#')) {
                            const r = parseInt(bgColor.slice(1, 3), 16);
                            const g = parseInt(bgColor.slice(3, 5), 16);
                            const b = parseInt(bgColor.slice(5, 7), 16);
                            const yiq = ((r*299)+(g*587)+(b*114))/1000;
                            attrs.textColor = (yiq >= 128) ? '#1e293b' : '#ffffff';
                        }
                    }
                }
                if (fgColor !== undefined && fgColor !== null) attrs.textColor = fgColor;
                editor.view.dispatch(
                    state.tr.setNodeMarkup(buttonPos, undefined, attrs)
                );
            } else {
                alert('Please place your cursor inside the Call Action Widget or Button to change its color.');
            }
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

            // Custom FAQ extensions to support details/summary block elements
            const FAQSection = _Node.create({
                name: 'faqSection',
                group: 'block',
                content: 'block+',
                selectable: true,
                draggable: true,
                parseHTML() {
                    return [{ tag: 'div.faq-section' }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['div', { class: 'faq-section' }, 0];
                }
            });

            const FAQItem = _Node.create({
                name: 'faqItem',
                group: 'block',
                content: 'faqQuestion faqAnswer',
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        open: {
                            default: 'true',
                            parseHTML: element => 'true',
                            renderHTML: attributes => ({ open: 'true' })
                        }
                    };
                },
                parseHTML() {
                    return [{ tag: 'details.faq-item' }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['details', mergeAttributes(HTMLAttributes, { class: 'faq-item', open: 'true' }), 0];
                }
            });

            const CTAWidget = _Node.create({
                name: 'ctaWidget',
                group: 'block',
                content: 'ctaText ctaButton',
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        backgroundColor: {
                            default: null,
                            parseHTML: element => element.style.background || element.style.backgroundColor || element.getAttribute('data-background-color') || null
                        },
                        width: {
                            default: '100%',
                            parseHTML: element => element.style.width || element.getAttribute('data-width') || '100%'
                        },
                        borderRadius: {
                            default: '12px',
                            parseHTML: element => element.style.borderRadius || element.getAttribute('data-border-radius') || '12px'
                        }
                    };
                },
                parseHTML() {
                    return [{ tag: 'div.cta-container' }];
                },
                renderHTML({ node, HTMLAttributes }) {
                    const { backgroundColor, width, borderRadius } = node.attrs;
                    let style = '';
                    if (backgroundColor) {
                        if (backgroundColor.includes('gradient')) {
                            style += `background: ${backgroundColor}; border: none;`;
                        } else {
                            style += `background-color: ${backgroundColor}; border-color: ${backgroundColor};`;
                        }
                    }
                    if (width) style += `width: ${width};`;
                    if (borderRadius) style += `border-radius: ${borderRadius};`;
                    return ['div', mergeAttributes(HTMLAttributes, { 
                        class: 'cta-container',
                        style,
                        'data-background-color': backgroundColor,
                        'data-width': width,
                        'data-border-radius': borderRadius
                    }), 0];
                }
            });

            const CTAText = _Node.create({
                name: 'ctaText',
                content: 'inline*',
                parseHTML() {
                    return [{ tag: 'span.cta-text' }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['span', { class: 'cta-text' }, 0];
                }
            });

            const CTAButton = _Node.create({
                name: 'ctaButton',
                content: 'text*',
                marks: '',
                addAttributes() {
                    return {
                        href: {
                            default: '#',
                            parseHTML: element => element.getAttribute('href') || '#',
                            renderHTML: attributes => ({ href: attributes.href })
                        },
                        backgroundColor: {
                            default: null,
                            parseHTML: element => element.style.backgroundColor || element.getAttribute('data-background-color') || null
                        },
                        textColor: {
                            default: null,
                            parseHTML: element => element.style.color || element.getAttribute('data-text-color') || null
                        }
                    };
                },
                parseHTML() {
                    return [{ tag: 'a.cta-button' }];
                },
                renderHTML({ node, HTMLAttributes }) {
                    const { href, backgroundColor, textColor } = node.attrs;
                    let style = '';
                    if (backgroundColor) style += `background: ${backgroundColor};`;
                    if (textColor) style += `color: ${textColor} !important;`;
                    return ['a', mergeAttributes(HTMLAttributes, { 
                        class: 'cta-button',
                        href,
                        style,
                        'data-background-color': backgroundColor,
                        'data-text-color': textColor
                    }), 0];
                }
            });

            const FAQQuestion = _Node.create({
                name: 'faqQuestion',
                content: 'inline*',
                parseHTML() {
                    return [{ tag: 'summary.faq-question' }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['summary', { class: 'faq-question' }, 0];
                }
            });

            const FAQAnswer = _Node.create({
                name: 'faqAnswer',
                content: 'block+',
                parseHTML() {
                    return [{ tag: 'div.faq-answer' }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['div', { class: 'faq-answer' }, 0];
                }
            });

            const FAQActions = _Node.create({
                name: 'faqActions',
                group: 'block',
                selectable: false,
                draggable: false,
                parseHTML() {
                    return [{ tag: 'div.faq-actions' }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['div', { 
                        class: 'faq-actions', 
                        contenteditable: 'false',
                        style: 'margin-top: 1rem; display: flex; justify-content: flex-end;'
                    }, ['button', {
                        type: 'button',
                        class: 'faq-add-btn',
                        style: 'background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;'
                    }, '+ Add Question']];
                }
            });

            const CalloutBox = _Node.create({
                name: 'calloutBox',
                group: 'block',
                content: 'block+',
                addAttributes() {
                    return {
                        type: {
                            default: 'info',
                            parseHTML: element => {
                                if (element.classList.contains('warning')) return 'warning';
                                if (element.classList.contains('success')) return 'success';
                                if (element.classList.contains('tip')) return 'tip';
                                return 'info';
                            }
                        }
                    };
                },
                parseHTML() {
                    return [{ tag: 'div.callout-box' }];
                },
                renderHTML({ HTMLAttributes }) {
                    const type = HTMLAttributes.type || 'info';
                    return ['div', { class: `callout-box ${type}` }, 0];
                }
            });

            const PatientCardWidget = _Node.create({
                name: 'patientCardWidget',
                group: 'block',
                atom: true,
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        patientName: { default: 'John Doe' },
                        patientAge: { default: '45' },
                        patientGender: { default: 'Male' },
                        uhid: { default: 'UHID-982341' },
                        bloodGroup: { default: 'O+' },
                        doctorName: { default: 'Dr. Sarah Jenkins' },
                        department: { default: 'Cardiology' },
                        visitDate: { default: '2026-07-07' }
                    };
                },
                parseHTML() {
                    return [{
                        tag: 'div.patient-card-widget',
                        getAttrs: dom => ({
                            patientName: dom.getAttribute('data-patient-name') || 'John Doe',
                            patientAge: dom.getAttribute('data-patient-age') || '45',
                            patientGender: dom.getAttribute('data-patient-gender') || 'Male',
                            uhid: dom.getAttribute('data-uhid') || 'UHID-982341',
                            bloodGroup: dom.getAttribute('data-blood-group') || 'O+',
                            doctorName: dom.getAttribute('data-doctor-name') || 'Dr. Sarah Jenkins',
                            department: dom.getAttribute('data-department') || 'Cardiology',
                            visitDate: dom.getAttribute('data-visit-date') || '2026-07-07'
                        })
                    }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['div', {
                        class: 'patient-card-widget clinical-widget-card',
                        'data-patient-name': HTMLAttributes.patientName,
                        'data-patient-age': HTMLAttributes.patientAge,
                        'data-patient-gender': HTMLAttributes.patientGender,
                        'data-uhid': HTMLAttributes.uhid,
                        'data-blood-group': HTMLAttributes.bloodGroup,
                        'data-doctor-name': HTMLAttributes.doctorName,
                        'data-department': HTMLAttributes.department,
                        'data-visit-date': HTMLAttributes.visitDate
                    }, [
                        ['div', { class: 'widget-header' }, 'Patient Identification Card'],
                        ['div', { class: 'widget-grid' },
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'Patient Name:'], ['span', { class: 'cell-value' }, HTMLAttributes.patientName]],
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'Age / Gender:'], ['span', { class: 'cell-value' }, `${HTMLAttributes.patientAge} / ${HTMLAttributes.patientGender}`]],
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'UHID:'], ['span', { class: 'cell-value' }, HTMLAttributes.uhid]],
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'Blood Group:'], ['span', { class: 'cell-value' }, HTMLAttributes.bloodGroup]],
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'Consulting Doctor:'], ['span', { class: 'cell-value' }, HTMLAttributes.doctorName]],
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'Department:'], ['span', { class: 'cell-value' }, HTMLAttributes.department]],
                            ['div', { class: 'grid-cell' }, ['span', { class: 'cell-label' }, 'Visit Date:'], ['span', { class: 'cell-value' }, HTMLAttributes.visitDate]]
                        ]
                    ]];
                }
            });

            const VitalsWidget = _Node.create({
                name: 'vitalsWidget',
                group: 'block',
                atom: true,
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        bp: { default: '120/80' },
                        pulse: { default: '72' },
                        respiration: { default: '16' },
                        temperature: { default: '98.6' },
                        weight: { default: '70' },
                        height: { default: '170' },
                        bmi: { default: '24.2' },
                        spo2: { default: '98' }
                    };
                },
                parseHTML() {
                    return [{
                        tag: 'div.vitals-widget',
                        getAttrs: dom => ({
                            bp: dom.getAttribute('data-bp') || '120/80',
                            pulse: dom.getAttribute('data-pulse') || '72',
                            respiration: dom.getAttribute('data-respiration') || '16',
                            temperature: dom.getAttribute('data-temperature') || '98.6',
                            weight: dom.getAttribute('data-weight') || '70',
                            height: dom.getAttribute('data-height') || '170',
                            bmi: dom.getAttribute('data-bmi') || '24.2',
                            spo2: dom.getAttribute('data-spo2') || '98'
                        })
                    }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['div', {
                        class: 'vitals-widget clinical-widget-card',
                        'data-bp': HTMLAttributes.bp,
                        'data-pulse': HTMLAttributes.pulse,
                        'data-respiration': HTMLAttributes.respiration,
                        'data-temperature': HTMLAttributes.temperature,
                        'data-weight': HTMLAttributes.weight,
                        'data-height': HTMLAttributes.height,
                        'data-bmi': HTMLAttributes.bmi,
                        'data-spo2': HTMLAttributes.spo2
                    }, [
                        ['div', { class: 'widget-header' }, 'Patient Vitals & Measurements'],
                        ['div', { class: 'vitals-grid' },
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '❤️'], ['span', { class: 'vital-label' }, 'BP:'], ['span', { class: 'vital-value' }, HTMLAttributes.bp]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '💓'], ['span', { class: 'vital-label' }, 'Pulse:'], ['span', { class: 'vital-value' }, `${HTMLAttributes.pulse} bpm`]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '🫁'], ['span', { class: 'vital-label' }, 'Respiration:'], ['span', { class: 'vital-value' }, `${HTMLAttributes.respiration} /min`]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '🌡️'], ['span', { class: 'vital-label' }, 'Temp:'], ['span', { class: 'vital-value' }, `${HTMLAttributes.temperature} °F`]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '⚖️'], ['span', { class: 'vital-label' }, 'Weight:'], ['span', { class: 'vital-value' }, `${HTMLAttributes.weight} kg`]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '📏'], ['span', { class: 'vital-label' }, 'Height:'], ['span', { class: 'vital-value' }, `${HTMLAttributes.height} cm`]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '📊'], ['span', { class: 'vital-label' }, 'BMI:'], ['span', { class: 'vital-value' }, HTMLAttributes.bmi]],
                            ['div', { class: 'vital-item' }, ['span', { class: 'vital-icon' }, '🩸'], ['span', { class: 'vital-label' }, 'SpO₂:'], ['span', { class: 'vital-value' }, `${HTMLAttributes.spo2} %`]]
                        ]
                    ]];
                }
            });

            const PrescriptionWidget = _Node.create({
                name: 'prescriptionWidget',
                group: 'block',
                atom: true,
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        medicines: {
                            default: JSON.stringify([
                                { name: 'Tab. Paracetamol 650mg', morning: '1', afternoon: '1', night: '1', days: '5', notes: 'Take after meals' },
                                { name: 'Syp. Cough Relief 10ml', morning: '1', afternoon: '0', night: '1', days: '3', notes: 'For dry cough' }
                            ])
                        }
                    };
                },
                parseHTML() {
                    return [{
                        tag: 'div.prescription-widget',
                        getAttrs: dom => ({
                            medicines: dom.getAttribute('data-medicines') || '[]'
                        })
                    }];
                },
                renderHTML({ HTMLAttributes }) {
                    let meds = [];
                    try {
                        meds = JSON.parse(HTMLAttributes.medicines);
                    } catch (e) {
                        meds = [];
                    }
                    const rows = meds.map(m => [
                        'tr', {},
                        ['td', {}, m.name || ''],
                        ['td', { style: 'text-align: center;' }, m.morning || '0'],
                        ['td', { style: 'text-align: center;' }, m.afternoon || '0'],
                        ['td', { style: 'text-align: center;' }, m.night || '0'],
                        ['td', { style: 'text-align: center;' }, m.days || '0'],
                        ['td', {}, m.notes || '']
                    ]);
                    
                    return ['div', {
                        class: 'prescription-widget clinical-widget-card',
                        'data-medicines': HTMLAttributes.medicines
                    }, [
                        ['div', { class: 'widget-header' }, 'Rx - Prescription Details'],
                        ['table', { class: 'prescription-table' },
                            ['thead', {},
                                ['tr', {},
                                    ['th', {}, 'Medicine Name'],
                                    ['th', { style: 'text-align: center; width: 60px;' }, 'Morning'],
                                    ['th', { style: 'text-align: center; width: 60px;' }, 'Afternoon'],
                                    ['th', { style: 'text-align: center; width: 60px;' }, 'Night'],
                                    ['th', { style: 'text-align: center; width: 60px;' }, 'Days'],
                                    ['th', {}, 'Notes / Instructions']
                                ]
                            ],
                            ['tbody', {}, ...rows]
                        ]
                    ]];
                }
            });

            const LabReportWidget = _Node.create({
                name: 'labReportWidget',
                group: 'block',
                atom: true,
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        tests: {
                            default: JSON.stringify([
                                { name: 'Hemoglobin (Hb)', result: '14.2', reference: '13.0 - 17.0', unit: 'g/dL', status: 'Normal' },
                                { name: 'Fasting Blood Sugar', result: '112', reference: '70 - 100', unit: 'mg/dL', status: 'High' }
                            ])
                        }
                    };
                },
                parseHTML() {
                    return [{
                        tag: 'div.lab-report-widget',
                        getAttrs: dom => ({
                            tests: dom.getAttribute('data-tests') || '[]'
                        })
                    }];
                },
                renderHTML({ HTMLAttributes }) {
                    let tests = [];
                    try {
                        tests = JSON.parse(HTMLAttributes.tests);
                    } catch (e) {
                        tests = [];
                    }
                    const rows = tests.map(t => {
                        const statusClass = (t.status || 'Normal').toLowerCase();
                        return [
                            'tr', {},
                            ['td', { style: 'font-weight: 600;' }, t.name || ''],
                            ['td', { style: 'font-weight: 700;' }, t.result || ''],
                            ['td', {}, t.reference || ''],
                            ['td', {}, t.unit || ''],
                            ['td', {}, ['span', { class: `status-badge ${statusClass}` }, t.status || 'Normal']]
                        ];
                    });
                    
                    return ['div', {
                        class: 'lab-report-widget clinical-widget-card',
                        'data-tests': HTMLAttributes.tests
                    }, [
                        ['div', { class: 'widget-header' }, 'Clinical Investigation Laboratory Report'],
                        ['table', { class: 'lab-report-table' },
                            ['thead', {},
                                ['tr', {},
                                    ['th', {}, 'Test Parameter'],
                                    ['th', {}, 'Observed Result'],
                                    ['th', {}, 'Reference Interval'],
                                    ['th', {}, 'Unit'],
                                    ['th', {}, 'Status']
                                ]
                            ],
                            ['tbody', {}, ...rows]
                        ]
                    ]];
                }
            });

            const DiagnosisWidget = _Node.create({
                name: 'diagnosisWidget',
                group: 'block',
                atom: true,
                selectable: true,
                draggable: true,
                addAttributes() {
                    return {
                        primaryDiagnosis: { default: 'Essential Hypertension' },
                        secondaryDiagnosis: { default: 'Type 2 Diabetes Mellitus' },
                        icdCode: { default: 'I10 / E11' },
                        clinicalNotes: { default: 'Patient reports mild headache. Advised low sodium diet.' }
                    };
                },
                parseHTML() {
                    return [{
                        tag: 'div.diagnosis-widget',
                        getAttrs: dom => ({
                            primaryDiagnosis: dom.getAttribute('data-primary-diagnosis') || 'Essential Hypertension',
                            secondaryDiagnosis: dom.getAttribute('data-secondary-diagnosis') || 'Type 2 Diabetes Mellitus',
                            icdCode: dom.getAttribute('data-icd-code') || 'I10 / E11',
                            clinicalNotes: dom.getAttribute('data-clinical-notes') || 'Patient reports mild headache. Advised low sodium diet.'
                        })
                    }];
                },
                renderHTML({ HTMLAttributes }) {
                    return ['div', {
                        class: 'diagnosis-widget clinical-widget-card',
                        'data-primary-diagnosis': HTMLAttributes.primaryDiagnosis,
                        'data-secondary-diagnosis': HTMLAttributes.secondaryDiagnosis,
                        'data-icd-code': HTMLAttributes.icdCode,
                        'data-clinical-notes': HTMLAttributes.clinicalNotes
                    }, [
                        ['div', { class: 'widget-header' }, 'Diagnosis & Clinical Impression Summary'],
                        ['div', { class: 'diagnosis-body' },
                            ['div', { class: 'diag-row' }, ['span', { class: 'diag-label' }, 'Primary Diagnosis:'], ['span', { class: 'diag-val primary' }, HTMLAttributes.primaryDiagnosis]],
                            ['div', { class: 'diag-row' }, ['span', { class: 'diag-label' }, 'Secondary Diagnosis:'], ['span', { class: 'diag-val' }, HTMLAttributes.secondaryDiagnosis]],
                            ['div', { class: 'diag-row' }, ['span', { class: 'diag-label' }, 'ICD-10 Code Reference:'], ['span', { class: 'diag-code' }, HTMLAttributes.icdCode]],
                            ['div', { class: 'diag-notes-container' },
                                ['span', { class: 'diag-notes-label' }, 'Clinical Progression Notes:'],
                                ['p', { class: 'diag-notes-content' }, HTMLAttributes.clinicalNotes]
                            ]
                        ]
                    ]];
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

            // Slash command variables and functions
            let slashMenuActive = false;
            let slashMenuEl = null;
            let queryText = '';
            let triggerPos = null;
            let filteredCommands = [];
            let activeCommandIndex = 0;

            const allCommands = [
                { title: 'Patient Card', type: 'patientCardWidget', icon: '📇', desc: 'Patient demographics card' },
                { title: 'Vitals', type: 'vitalsWidget', icon: '❤️', desc: 'Blood pressure, pulse, temp, BMI' },
                { title: 'Prescription', type: 'prescriptionWidget', icon: '💊', desc: 'Medicine Rx details table' },
                { title: 'Lab Report', type: 'labReportWidget', icon: '🧪', desc: 'Laboratory parameters table' },
                { title: 'Diagnosis', type: 'diagnosisWidget', icon: '🩺', desc: 'Primary & secondary impression' },
                { title: 'Callout', type: 'callout', icon: 'ℹ️', desc: 'Clinical info/alert notice box' },
                { title: 'Table', type: 'table', icon: '📅', desc: 'Insert a standard data table' },
                { title: 'Paragraph', type: 'paragraph', icon: '✍️', desc: 'Standard paragraph body text' },
                { title: 'Heading 1', type: 'h1', icon: 'H1', desc: 'Main section heading' },
                { title: 'Heading 2', type: 'h2', icon: 'H2', desc: 'Subsection heading' },
                { title: 'Heading 3', type: 'h3', icon: 'H3', desc: 'Minor subsection heading' },
                { title: 'Divider', type: 'divider', icon: '➖', desc: 'Horizontal line break' },
                { title: 'Call Action', type: 'cta', icon: '📞', desc: 'Button with action/link' }
            ];

            function showSlashMenu(editor) {
                if (slashMenuActive) return;
                
                triggerPos = editor.state.selection.from - 1; // position of /
                
                slashMenuEl = document.createElement('div');
                slashMenuEl.className = 'tiptap-slash-menu';
                slashMenuEl.style.position = 'absolute';
                slashMenuEl.style.zIndex = '99999';
                slashMenuEl.style.background = '#ffffff';
                slashMenuEl.style.border = '1px solid #cbd5e1';
                slashMenuEl.style.borderRadius = '6px';
                slashMenuEl.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
                slashMenuEl.style.padding = '4px';
                slashMenuEl.style.width = '220px';
                
                // Position it relative to cursor
                const coords = editor.view.coordsAtPos(editor.state.selection.from);
                if (coords) {
                    slashMenuEl.style.left = `${coords.left + window.scrollX}px`;
                    slashMenuEl.style.top = `${coords.bottom + window.scrollY + 5}px`;
                }
                
                document.body.appendChild(slashMenuEl);
                slashMenuActive = true;
                queryText = '';
                filteredCommands = [...allCommands];
                activeCommandIndex = 0;
                renderSlashMenuItems();
            }

            function executeCommand(cmd) {
                const currentPos = editor.state.selection.from;
                editor.chain().focus()
                    .deleteRange({ from: triggerPos, to: currentPos })
                    .run();

                window.editorInterop.insertWidget(cmd.type);
            }

            function updateQuery() {
                const currentPos = editor.state.selection.from;
                if (currentPos <= triggerPos) {
                    hideSlashMenu();
                    return;
                }
                const text = editor.state.doc.textBetween(triggerPos + 1, currentPos);
                queryText = text.toLowerCase();
                
                filteredCommands = allCommands.filter(c => 
                    c.title.toLowerCase().includes(queryText) || 
                    c.desc.toLowerCase().includes(queryText)
                );
                
                activeCommandIndex = 0;
                renderSlashMenuItems();
            }

            function renderSlashMenuItems() {
                if (!slashMenuEl) return;
                slashMenuEl.innerHTML = '';
                
                if (filteredCommands.length === 0) {
                    slashMenuEl.innerHTML = '<div class="slash-menu-empty" style="padding: 8px 12px; font-size: 0.8rem; color: #64748b;">No matching blocks found</div>';
                    return;
                }
                
                filteredCommands.forEach((cmd, idx) => {
                    const item = document.createElement('div');
                    item.className = `slash-menu-item ${idx === activeCommandIndex ? 'active' : ''}`;
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.gap = '8px';
                    item.style.padding = '6px 12px';
                    item.style.cursor = 'pointer';
                    item.style.borderRadius = '4px';
                    if (idx === activeCommandIndex) {
                        item.style.background = '#eff6ff';
                        item.style.color = '#1d4ed8';
                    } else {
                        item.style.background = 'transparent';
                        item.style.color = '#1e293b';
                    }
                    
                    item.innerHTML = `
                        <span class="slash-menu-icon" style="font-size: 1.1rem;">${cmd.icon}</span>
                        <div class="slash-menu-details" style="display: flex; flex-direction: column;">
                            <span class="slash-menu-title" style="font-weight: 600; font-size: 0.8rem;">${cmd.title}</span>
                            <span class="slash-menu-desc" style="font-size: 0.65rem; color: #64748b;">${cmd.desc}</span>
                        </div>
                    `;
                    
                    item.addEventListener('click', () => {
                        executeCommand(cmd);
                        hideSlashMenu();
                    });
                    
                    slashMenuEl.appendChild(item);
                });
            }

            function hideSlashMenu() {
                if (slashMenuEl) {
                    slashMenuEl.remove();
                    slashMenuEl = null;
                }
                slashMenuActive = false;
            }

            const handleSlashKeydown = (e) => {
                if (!slashMenuActive) return false;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeCommandIndex = (activeCommandIndex + 1) % filteredCommands.length;
                    renderSlashMenuItems();
                    return true;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeCommandIndex = (activeCommandIndex - 1 + filteredCommands.length) % filteredCommands.length;
                    renderSlashMenuItems();
                    return true;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executeCommand(filteredCommands[activeCommandIndex]);
                    hideSlashMenu();
                    return true;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideSlashMenu();
                    return true;
                }
                if (e.key === 'Backspace') {
                    const currentPos = editor.state.selection.from;
                    if (currentPos <= triggerPos + 1) {
                        hideSlashMenu();
                    } else {
                        setTimeout(updateQuery, 10);
                    }
                    return false;
                }
                
                if (e.key.length === 1) {
                    setTimeout(updateQuery, 10);
                }
                return false;
            };

            // Bubble Menu variables and functions
            let bubbleMenuEl = null;
            let bubbleMenuVisible = false;

            function updateBubbleMenu(editor) {
                const { selection } = editor.state;
                if (selection.empty || !editor.isFocused) {
                    hideBubbleMenu();
                    return;
                }

                const { from, to } = selection;
                const startCoords = editor.view.coordsAtPos(from);
                const endCoords = editor.view.coordsAtPos(to);

                if (!bubbleMenuEl) {
                    bubbleMenuEl = document.createElement('div');
                    bubbleMenuEl.className = 'tiptap-bubble-menu';
                    bubbleMenuEl.style.position = 'absolute';
                    bubbleMenuEl.style.zIndex = '9999';
                    bubbleMenuEl.style.background = 'rgba(255, 255, 255, 0.85)';
                    bubbleMenuEl.style.backdropFilter = 'blur(8px)';
                    bubbleMenuEl.style.border = '1px solid rgba(226, 232, 240, 0.8)';
                    bubbleMenuEl.style.borderRadius = '8px';
                    bubbleMenuEl.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    bubbleMenuEl.style.padding = '4px';
                    bubbleMenuEl.style.display = 'flex';
                    bubbleMenuEl.style.gap = '4px';

                    bubbleMenuEl.innerHTML = `
                        <button type="button" class="bubble-btn bold-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85rem;" title="Bold">B</button>
                        <button type="button" class="bubble-btn italic-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-style: italic; font-size: 0.85rem;" title="Italic">I</button>
                        <button type="button" class="bubble-btn underline-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; text-decoration: underline; font-size: 0.85rem;" title="Underline">U</button>
                        <button type="button" class="bubble-btn strike-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; text-decoration: line-through; font-size: 0.85rem;" title="S">S</button>
                        <div style="width: 1px; background: #e2e8f0; margin: 4px 2px;"></div>
                        <button type="button" class="bubble-btn highlight-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;" title="Highlight">✨</button>
                        <button type="button" class="bubble-btn color-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;" title="Text Color">🎨</button>
                        <button type="button" class="bubble-btn link-btn" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;" title="Add Link">🔗</button>
                        <button type="button" class="bubble-btn ai-btn" style="border: none; background: #eff6ff; color: #1d4ed8; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;" title="AI Assistant">🤖 AI</button>
                    `;
                    
                    bubbleMenuEl.querySelector('.bold-btn').addEventListener('click', () => { editor.chain().focus().toggleBold().run(); });
                    bubbleMenuEl.querySelector('.italic-btn').addEventListener('click', () => { editor.chain().focus().toggleItalic().run(); });
                    bubbleMenuEl.querySelector('.underline-btn').addEventListener('click', () => { editor.chain().focus().toggleUnderline().run(); });
                    bubbleMenuEl.querySelector('.strike-btn').addEventListener('click', () => { editor.chain().focus().toggleStrike().run(); });
                    bubbleMenuEl.querySelector('.highlight-btn').addEventListener('click', () => { 
                        const color = prompt('Highlight color:', '#fef08a');
                        if (color) editor.chain().focus().toggleHighlight({ color }).run();
                    });
                    bubbleMenuEl.querySelector('.color-btn').addEventListener('click', () => { 
                        const color = prompt('Text color:', '#ef4444');
                        if (color) editor.chain().focus().setColor(color).run();
                    });
                    bubbleMenuEl.querySelector('.link-btn').addEventListener('click', () => { 
                        const current = editor.getAttributes('link').href || '';
                        const href = prompt('Link URL:', current);
                        if (href) editor.chain().focus().setLink({ href }).run();
                        else if (href === '') editor.chain().focus().unsetLink().run();
                    });
                    bubbleMenuEl.querySelector('.ai-btn').addEventListener('click', () => { 
                        if (window.quillDotNet) {
                            window.quillDotNet.invokeMethodAsync('OnAIRewriteRequested', editor.state.doc.textBetween(from, to));
                        }
                    });

                    document.body.appendChild(bubbleMenuEl);
                }

                bubbleMenuVisible = true;
                bubbleMenuEl.style.display = 'flex';
                
                if (startCoords && endCoords) {
                    const left = (startCoords.left + endCoords.right) / 2;
                    const top = startCoords.top - 45;
                    bubbleMenuEl.style.left = `${Math.max(10, left - bubbleMenuEl.offsetWidth / 2) + window.scrollX}px`;
                    bubbleMenuEl.style.top = `${top + window.scrollY}px`;
                }
            }

            function hideBubbleMenu() {
                if (bubbleMenuEl) {
                    bubbleMenuEl.style.display = 'none';
                }
                bubbleMenuVisible = false;
            }

            const editor = new m.Editor({
                element: container,
                editorProps: {
                    handleKeyDown(view, event) {
                        if (slashMenuActive) {
                            const handled = handleSlashKeydown(event);
                            if (handled) return true;
                        }
                        if (event.key === '/') {
                            setTimeout(() => showSlashMenu(editor), 10);
                        }
                        return false;
                    }
                },
                extensions: [
                    m.StarterKit,
                    m.Underline,
                    m.Link.configure({ openOnClick: false }),
                    CustomImage,
                    CustomVideo,
                    PageBreak,
                    FAQSection,
                    FAQItem,
                    FAQQuestion,
                    FAQAnswer,
                    FAQActions,
                    CTAWidget,
                    CTAText,
                    CTAButton,
                    CalloutBox,
                    PatientCardWidget,
                    VitalsWidget,
                    PrescriptionWidget,
                    LabReportWidget,
                    DiagnosisWidget,
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
                content: window.editorInterop.cleanCTAHTML(initialValue) || '<p></p>',
                onUpdate: ({ editor }) => {
                    const html = window.editorInterop.cleanCTAHTML(editor.getHTML());
                    dotNetHelper.invokeMethodAsync('OnEditorContentChanged', html);
                    window.editorInterop.updateActiveStates(editor);
                    window.editorInterop.updateCurrentPageFromSelection(editor);
                    window.editorInterop.syncAllTablesStyles(editor);
                    updateBubbleMenu(editor);
                    
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
                    updateBubbleMenu(editor);
                    
                    // Report active node selection to Blazor Properties Inspector
                    if (window.quillDotNet) {
                        const { selection } = editor.state;
                        let nodeName = 'paragraph';
                        let attrs = {};
                        
                        if (selection.node) {
                            nodeName = selection.node.type.name;
                            attrs = selection.node.attrs;
                        } else {
                            const $from = selection.$from;
                            if ($from) {
                                const parent = $from.parent;
                                if (parent) {
                                    nodeName = parent.type.name;
                                    attrs = parent.attrs;
                                }
                            }
                        }
                        
                        window.quillDotNet.invokeMethodAsync('OnNodeSelectionChanged', nodeName, JSON.stringify(attrs));
                    }
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

            // Handle CTA resizing dragging
            container.addEventListener('mousedown', (e) => {
                const resizer = e.target.closest('.cta-resizer');
                if (!resizer) return;

                e.preventDefault();
                e.stopPropagation();

                const ctaContainer = resizer.closest('.cta-container');
                if (!ctaContainer) return;

                const isRight = resizer.classList.contains('cta-resizer-r') || resizer.classList.contains('cta-resizer-br');
                const startX = e.clientX;
                const startWidth = ctaContainer.getBoundingClientRect().width;
                const parentWidth = ctaContainer.parentElement.getBoundingClientRect().width;

                const onMouseMove = (moveEvent) => {
                    let deltaX = moveEvent.clientX - startX;
                    if (!isRight) {
                        deltaX = -deltaX;
                    }
                    let newWidth = startWidth + deltaX * 2;
                    if (isRight) {
                        newWidth = startWidth + deltaX;
                    }

                    const widthPercent = Math.max(10, Math.min(100, (newWidth / parentWidth) * 100));
                    ctaContainer.style.width = `${widthPercent}%`;
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    // Save the new width attribute to Tiptap node!
                    const pos = editor.view.posAtDOM(ctaContainer);
                    if (pos !== undefined && pos !== null) {
                        let widgetPos = -1;
                        let widgetNode = null;
                        const $pos = editor.state.doc.resolve(pos);
                        for (let d = $pos.depth; d >= 0; d--) {
                            const node = $pos.node(d);
                            if (node && node.type.name === 'ctaWidget') {
                                widgetPos = $pos.before(d);
                                widgetNode = node;
                                break;
                            }
                        }
                        if (widgetPos === -1) {
                            editor.state.doc.nodesBetween(Math.max(0, pos - 5), Math.min(editor.state.doc.content.size, pos + 5), (node, nodePos) => {
                                if (node.type.name === 'ctaWidget') {
                                    widgetPos = nodePos;
                                    widgetNode = node;
                                    return false;
                                }
                            });
                        }
                        if (widgetPos > -1 && widgetNode) {
                            editor.view.dispatch(
                                editor.state.tr.setNodeMarkup(widgetPos, undefined, {
                                    ...widgetNode.attrs,
                                    width: ctaContainer.style.width
                                })
                            );
                        }
                    }
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Document-wide click listener to clean up resize handles when clicking away
            const cleanUpResizers = (evt) => {
                if (!container.contains(evt.target)) {
                    container.querySelectorAll('.cta-resizer').forEach(r => r.remove());
                }
            };
            document.removeEventListener('click', window._cleanUpCTAValues);
            window._cleanUpCTAValues = cleanUpResizers;
            document.addEventListener('click', cleanUpResizers);

            // Capture clicks to handle custom interactive editor widgets (FAQ additions, summaries, CTA buttons, resize handles initialization)
            container.addEventListener('click', (e) => {
                // Initialize CTA Resize Handles if clicked
                const cta = e.target.closest('.cta-container');
                container.querySelectorAll('.cta-container').forEach(el => {
                    if (el !== cta) {
                        el.querySelectorAll('.cta-resizer').forEach(r => r.remove());
                    }
                });

                if (cta && !e.target.closest('.cta-resizer')) {
                    if (!cta.querySelector('.cta-resizer')) {
                        const r = document.createElement('div');
                        r.className = 'cta-resizer cta-resizer-r';
                        r.setAttribute('contenteditable', 'false');

                        const l = document.createElement('div');
                        l.className = 'cta-resizer cta-resizer-l';
                        l.setAttribute('contenteditable', 'false');

                        const br = document.createElement('div');
                        br.className = 'cta-resizer cta-resizer-br';
                        br.setAttribute('contenteditable', 'false');

                        cta.appendChild(r);
                        cta.appendChild(l);
                        cta.appendChild(br);
                    }
                }

                const addBtn = e.target.closest('.faq-add-btn');
                if (addBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.editorInterop.addFaqItem(addBtn);
                    return;
                }

                const ctaBtn = e.target.closest('.cta-button');
                if (ctaBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentHref = ctaBtn.getAttribute('href') || '#';
                    const newUrl = prompt('Enter button link URL (e.g., tel:8110899999, /contact, or URL):', currentHref);
                    if (newUrl !== null) {
                        let buttonPos = -1;
                        let buttonNode = null;
                        
                        editor.state.doc.descendants((node, pos) => {
                            if (node.type.name === 'ctaButton') {
                                const dom = editor.view.nodeDOM(pos);
                                if (dom === ctaBtn || dom?.contains(ctaBtn) || ctaBtn.contains(dom)) {
                                    buttonPos = pos;
                                    buttonNode = node;
                                    return false; // Stop iteration
                                }
                            }
                        });

                        if (buttonPos > -1 && buttonNode) {
                            editor.view.dispatch(
                                editor.state.tr.setNodeMarkup(buttonPos, undefined, {
                                    ...buttonNode.attrs,
                                    href: newUrl
                                })
                            );
                            // Ensure DOM attribute is updated instantly for instant interactivity
                            ctaBtn.setAttribute('href', newUrl);
                        }
                    }
                    return;
                }

                const summary = e.target.closest('.faq-question');
                if (summary) {
                    // Let the default click happen so text can be focused/edited
                    // But ensure the details tag stays open
                    const details = summary.parentElement;
                    if (details && details.tagName === 'DETAILS') {
                        setTimeout(() => {
                            details.setAttribute('open', 'true');
                            details.open = true;
                        }, 0);
                    }
                }
            }, true); // Use capture phase!

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
                case 'insertFAQ':
                    const faqHtml = `<div class="faq-section">
                        <h3>Frequently Asked Questions (FAQ)</h3>
                        <details class="faq-item" open>
                            <summary class="faq-question">Q: What is the turnaround time for standard laboratory reports?</summary>
                            <div class="faq-answer">
                                <p>A: Most routine tests are processed within 4 to 12 hours. Specialized molecular or histopathology studies may take 24 to 48 hours.</p>
                            </div>
                        </details>
                        <details class="faq-item" open>
                            <summary class="faq-question">Q: Do I need to fast before my scheduled blood draw?</summary>
                            <div class="faq-answer">
                                <p>A: Fasting for 10-12 hours is recommended for fasting blood glucose, lipid profiles, and comprehensive metabolic panels. Please drink plain water to stay hydrated.</p>
                            </div>
                        </details>
                        <div class="faq-actions"></div>
                    </div><p></p>`;
                    editor.chain().focus().insertContent(faqHtml).run();
                    break;
                case 'insertCallout':
                    let calloutHtml = '';
                    if (value === 'info') {
                        calloutHtml = `<div class="callout-box info">
                            <p><strong>ℹ️ Info Notice</strong></p>
                            <p>Please ensure all patient information matches the requisition form before submitting the clinical sample.</p>
                        </div><p></p>`;
                    } else if (value === 'warning') {
                        calloutHtml = `<div class="callout-box warning">
                            <p><strong>⚠️ Clinical Warning</strong></p>
                            <p>Critical value thresholds: Hemoglobin < 7.0 g/dL or Potassium > 6.0 mEq/L require immediate specialist alert notification.</p>
                        </div><p></p>`;
                    } else if (value === 'success') {
                        calloutHtml = `<div class="callout-box success">
                            <p><strong>✅ Quality Assurance Verified</strong></p>
                            <p>All control runs are within normal standard deviation limits. NABL calibration check completed successfully.</p>
                        </div><p></p>`;
                    } else if (value === 'tip') {
                        calloutHtml = `<div class="callout-box tip">
                            <p><strong>💡 Lab Tip</strong></p>
                            <p>Pre-analytical errors can be minimized by gently inverting EDTA anticoagulant tubes 8-10 times immediately after collection.</p>
                        </div><p></p>`;
                    }
                    editor.chain().focus().insertContent(calloutHtml).run();
                    break;
                case 'insertCTA':
                    const ctaHtml = `<div class="cta-container"><span class="cta-text">Do you have any queries? Contact our helpdesk:</span><a href="/contact" class="cta-button">Contact Us</a></div><p></p>`;
                    editor.chain().focus().insertContent(ctaHtml).run();
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
                window.tiptapInstance.commands.setContent(window.editorInterop.cleanCTAHTML(html) || '<p></p>');
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
        // Returns the href of the link at the current cursor position, or '' if none
        getCurrentLinkHref: function () {
            if (!window.tiptapInstance) return '';
            const attrs = window.tiptapInstance.getAttributes('link');
            return attrs && attrs.href ? attrs.href : '';
        },

        // Sets a link on the current selection (or extends it if already a link)
        applyLink: function (url) {
            if (!window.tiptapInstance) return;
            window.tiptapInstance.chain().focus().setLink({ href: url, target: '_blank' }).run();
        },

        // Removes the link mark from the current selection
        removeLink: function () {
            if (!window.tiptapInstance) return;
            window.tiptapInstance.chain().focus().unsetLink().run();
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
