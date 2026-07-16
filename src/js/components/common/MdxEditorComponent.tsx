import React from 'react';
import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    CodeToggle,
    CreateLink,
    diffSourcePlugin,
    frontmatterPlugin,
    headingsPlugin,
    imagePlugin,
    InsertTable,
    InsertThematicBreak,
    linkPlugin,
    listsPlugin,
    ListsToggle,
    markdownShortcutPlugin,
    MDXEditor,
    quotePlugin,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    UndoRedo
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

interface MdxEditorComponentProps {
    markdown: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    readOnly?: boolean;
    showToolbar?: boolean;
    showDiffToggle?: boolean;
}

const MdxEditorComponent: React.FC<MdxEditorComponentProps> = ({
                                                                   markdown,
                                                                   onChange,
                                                                   placeholder = 'Type markdown here...',
                                                                   minHeight = '200px',
                                                                   maxHeight = '500px',
                                                                   readOnly = false,
                                                                   showToolbar = true,
                                                                   showDiffToggle = false
                                                               }) => {
    return (
        <div style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            minHeight: minHeight,
            maxHeight: maxHeight,
            overflow: 'auto'
        }}>
            <MDXEditor
                markdown={markdown}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                contentEditableClassName="mdx-editor-content"
                plugins={[
                    headingsPlugin(),
                    listsPlugin(),
                    quotePlugin(),
                    thematicBreakPlugin(),
                    markdownShortcutPlugin(),
                    linkPlugin(),
                    tablePlugin(),
                    frontmatterPlugin(),
                    imagePlugin(),
                    ...(showDiffToggle ? [diffSourcePlugin({viewMode: 'rich-text'})] : []),
                    ...(showToolbar ? [toolbarPlugin({
                        toolbarContents: () => (
                            <>
                                <UndoRedo/>
                                <BoldItalicUnderlineToggles/>
                                <CodeToggle/>
                                <ListsToggle/>
                                <BlockTypeSelect/>
                                <CreateLink/>
                                <InsertTable/>
                                <InsertThematicBreak/>
                            </>
                        )
                    })] : [])
                ]}
            />
        </div>
    );
};

export default MdxEditorComponent;
