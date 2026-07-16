import {Box, Paper, Tab, Tabs} from "@mui/material";
import React, {useState} from "react";
import {styled} from "@mui/material/styles";
import type {FairMarkdownDocument} from "../types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AttributionIcon from "@mui/icons-material/Attribution";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AttachmentIcon from "@mui/icons-material/Attachment";
import SubjectIcon from "@mui/icons-material/Subject";
import GeneralInfoEditor from "./sections/GeneralInfoEditor";
import AuthorsEditor from "./sections/AuthorsEditor";
import LearningOutcomesEditor from "./sections/LearningOutcomesEditor";
import ActivitiesEditor from "./sections/ActivitiesEditor";
import PrerequisitesEditor from "./sections/PrerequisitesEditor";
import ResourcesEditor from "./sections/ResourcesEditor";
import ContentEditor from "./sections/ContentEditor";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const {children, value, index, ...other} = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`editor-tabpanel-${index}`}
            aria-labelledby={`editor-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{p: 3}}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `editor-tab-${index}`,
        'aria-controls': `editor-tabpanel-${index}`,
    };
}

interface StyledTabProps {
    label: string;
    icon?: React.ReactElement;
    iconPosition?: 'start' | 'end' | 'top' | 'bottom';
}

const StyledTab = styled((props: StyledTabProps) => <Tab disableRipple {...props} />)(
    ({theme}) => ({
        minHeight: '48px',
        textTransform: 'none',
    }),
);

export function EditorTabs(props: {
    document?: FairMarkdownDocument,
    onDocumentChange: (updatedDocument: Partial<FairMarkdownDocument>) => void,
    owner?: string,
    repo?: string,
    branch?: string
}) {
    const [tabValue, setTabValue] = useState<number>(0);
        if(props.document === undefined) {
            return <>No document</>;
        }

        return <Paper elevation={3} sx={{mb: 4}}>
        <Box sx={{borderBottom: 1, borderColor: "divider"}}>
            <Tabs
                value={tabValue}
                onChange={(event: React.SyntheticEvent, newValue: number) => {
                    setTabValue(newValue);
                }}
            >
                <StyledTab {...a11yProps(0)} icon={<InfoOutlinedIcon/>} iconPosition="start" label="General Info"/>
                <StyledTab {...a11yProps(1)} icon={<AttributionIcon/>} iconPosition="start" label="Authors"/>
                <StyledTab {...a11yProps(2)} icon={<TrackChangesIcon/>} iconPosition="start" label="Learning Outcomes"/>
                <StyledTab {...a11yProps(3)} icon={<EventNoteOutlinedIcon/>} iconPosition="start" label="Activities"/>
                <StyledTab {...a11yProps(4)} icon={<ChecklistIcon/>} iconPosition="start" label="Prerequisites"/>
                <StyledTab {...a11yProps(5)} icon={<AttachmentIcon/>} iconPosition="start" label="Resources"/>
                <StyledTab {...a11yProps(6)} icon={<SubjectIcon/>} iconPosition="start" label="Content"/>
            </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
            <GeneralInfoEditor
                document={props.document}
                onChange={props.onDocumentChange}
            />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
            <AuthorsEditor
                document={props.document}
                onChange={props.onDocumentChange}
                owner={props.owner}
                repo={props.repo}
                branch={props.branch}
            />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
            <LearningOutcomesEditor
                document={props.document}
                onChange={props.onDocumentChange}
            />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
            <ActivitiesEditor
                document={props.document}
                onChange={props.onDocumentChange}
            />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
            <PrerequisitesEditor
                document={props.document}
                onChange={props.onDocumentChange}
            />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
            <ResourcesEditor
                document={props.document}
                onChange={props.onDocumentChange}
            />
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
            <ContentEditor
                document={props.document}
                onChange={props.onDocumentChange}
            />
        </TabPanel>
    </Paper>;
}