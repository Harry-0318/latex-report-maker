import React from 'react';

export default function CodeCell({ cell, updateCell }) {
    return (
        <div className="cell-code">
            <textarea
                placeholder="Enter code here..."
                value={cell.content}
                onChange={(e) => updateCell(cell.id, { content: e.target.value })}
                className="font-mono"
                spellCheck="false"
            />
        </div>
    );
}
