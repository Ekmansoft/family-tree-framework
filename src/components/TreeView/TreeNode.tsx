import React from 'react';

interface TreeNodeProps {
    name?: string;
    individual?: any;
    children?: TreeNodeProps[];
    onEdit?: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, individual, children, onEdit }) => {
    const displayName = individual?.name ?? name ?? 'Unnamed';
    return (
        <div className="tree-node">
            <span onClick={onEdit} className="tree-node-name">{displayName}</span>
            {children && children.length > 0 && (
                <div className="tree-node-children">
                    {children.map((child, index) => (
                        <TreeNode key={index} {...child} onEdit={onEdit} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TreeNode;