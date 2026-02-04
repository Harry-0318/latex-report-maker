import React from 'react';

export default function TextCell({ cell, updateCell }) {
    return (
        <div className="cell-text">
            <textarea
                placeholder="Enter text here..."
                value={cell.content}
                onChange={(e) => updateCell(cell.id, { content: e.target.value })}
                rows={4}
            />
        </div>
    );
}
