import React from 'react';
import Engine from '../core/engine';
import { TreeView } from '../components/TreeView/TreeView';
import Toolbar from '../components/Shared/Toolbar';

export class Renderer extends React.Component<any, any> {
    engine: any;
    constructor(props?: any) {
        super(props);
        this.state = {
            familyTree: null,
            selectedPerson: null,
        };
        this.engine = new Engine();
    }

    componentDidMount() {
        this.loadFamilyTree();
        this.engine.on('update', this.handleUpdate);
    }

    componentWillUnmount() {
        this.engine.off('update', this.handleUpdate);
    }

    loadFamilyTree = async () => {
        const familyTree = await this.engine.loadGedcom('path/to/gedcom/file.ged');
        this.setState({ familyTree });
    };

    handleUpdate = () => {
        this.setState({ familyTree: this.engine.getFamilyTree() });
    };

    selectPerson = (person: any) => {
        this.setState({ selectedPerson: person });
    };

    render() {
        const { familyTree, selectedPerson } = this.state;

        return (
            <div className="family-tree-renderer">
                <Toolbar onSave={() => {}} onUndo={() => {}} onRedo={() => {}} />
                {familyTree ? (
                    <TreeView individuals={familyTree} />
                ) : (
                    <div>Loading family tree...</div>
                )}
                {/* Additional components for editing selected person can be added here */}
            </div>
        );
    }
}