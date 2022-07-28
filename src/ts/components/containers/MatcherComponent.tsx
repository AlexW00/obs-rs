import * as React from "react";
import {useContext, useEffect, useState} from "react";
import * as wasm from "../../../../pkg";
import {
    LinkMatch, LinkTargetCandidate,
    Note,
    NoteChangeOperation,
    NoteMatchingResult,
    NoteScannedEvent,
    Replacement, SelectionItem
} from "../../../../pkg";
import JsNote from "../../JsNote";
import {AppContext, NoteFilesContext, WasmWorkerInstanceContext} from "../../context";
import Progress from "../../Progress";
import {ProgressComponent} from "../general/ProgressComponent";
import {NoteMatchingResultsList} from "../lists/NoteMatchingResultsListComponent";
import {TFile} from "obsidian";

enum MatchingState {
    Scanning,
    Selecting,
    Replacing,
    Finished
}

export const MatcherComponent = () => {

    const {vault, metadataCache, fileManager} = useContext(AppContext);
    const wasmWorkerInstance = useContext(WasmWorkerInstanceContext);

    const [matchingState, setMatchingState] = useState<MatchingState>(MatchingState.Scanning);
    const [numberOfLinkedNotes, setNumberOfLinkedNotes] = useState<number>(0);

    const [noteMatchingResults, setNoteMatchingResults] = useState<Array<NoteMatchingResult>>([]);
    const [linkMatchingProgress] = useState<Progress>(new Progress(JsNote.getNumberOfNotes(vault, metadataCache)));
    const [note_change_operations, set_note_change_operations] = useState<Map<String, NoteChangeOperation>>(new Map());

    const onLinkMatchingProgress = (noteScannedEvent: NoteScannedEvent) => {
        //console.log(noteScannedEvent);
        linkMatchingProgress.increment();
        if (linkMatchingProgress.isComplete()) setMatchingState(MatchingState.Selecting)
    }

    const handleNoteChangeOperationSelected = (note_change_operation: NoteChangeOperation, doAdd: boolean) => {
        const new_note_change_operations: Map<String, NoteChangeOperation> = note_change_operations;

        if (doAdd) addNoteChangeOperation(new_note_change_operations, note_change_operation)
        else removeNoteChangeOperation(new_note_change_operations, note_change_operation)
    }

    const removeNoteChangeOperation = (new_note_change_operations: Map<String, NoteChangeOperation>, note_change_operation_to_remove: NoteChangeOperation) => {
        const didDelete = new_note_change_operations.delete(note_change_operation_to_remove.path)
        if (didDelete) set_note_change_operations(new_note_change_operations)
    }

    const addNoteChangeOperation = (new_note_change_operations: Map<String, NoteChangeOperation>, new_note_change_operation: NoteChangeOperation) => {
        if (!new_note_change_operations.has(new_note_change_operation.path)) {
            new_note_change_operations.set(new_note_change_operation.path, new_note_change_operation)
        } else {
            const existing_note_change_operation = new_note_change_operations.get(new_note_change_operation.path);

            new_note_change_operation.replacements.forEach((replacement: Replacement) => {
                const index = existing_note_change_operation.replacements.findIndex(((r: Replacement) => r.position.is_equal_to(replacement.position)))
                //console.log(index);
                if (index != -1) existing_note_change_operation.replacements[index] = replacement;
                else existing_note_change_operation.replacements.push(replacement);
            })
            new_note_change_operations.set(new_note_change_operation.path, existing_note_change_operation)
            set_note_change_operations(new_note_change_operations)
            //console.log(note_change_operations)
        }
    }

    const handleReplaceButtonClicked = () => {
        setMatchingState(MatchingState.Replacing);
        const operations: Array<Promise<void>> = [];
        note_change_operations.forEach((op : NoteChangeOperation) => {
            op.apply_replacements()
            const noteFile = noteFiles.get(op.path);
            operations.push(vault.modify(noteFile, op.content));
        })
        Promise.all(operations).then(() => {
            onDidLinkNotes(operations.length)
        })
    }

    const onDidLinkNotes = (num: number) => {
        setNumberOfLinkedNotes(num);
        setMatchingState(MatchingState.Finished)
    }

    const initNoteChangeOperations = (noteLinkMatchResults: Array<NoteMatchingResult>) => {
        const operations : Map<String, NoteChangeOperation> = new Map;
            noteLinkMatchResults.forEach((result: NoteMatchingResult) => {
            const path = result.note.path;
            const content = result.note.content;
            const replacements : Array<Replacement> = [];
            result.link_matches.forEach((match: LinkMatch) => {
                match.link_match_target_candidate.forEach((candidate: LinkTargetCandidate) => {
                    candidate.replacement_selection_items.forEach((selection: SelectionItem) => {
                        if (selection.is_selected) {
                            replacements.push(
                                new Replacement(
                                    match.position,
                                    fileManager.generateMarkdownLink(
                                        noteFiles.get(candidate.path),
                                        result.note.path,
                                        null,
                                        selection.content == result.note.title
                                            ? null
                                            : selection.content
                                    )
                                )
                            )
                            return;
                        }
                    })
                })
            })
            if (replacements.length > 0) operations.set(path, new NoteChangeOperation(
                path,
                content,
                replacements
            ))
        })
        set_note_change_operations(operations)
    }
    const initNoteFiles = () : Map<String, TFile> => {
        const noteFiles = new Map<String, TFile>();
        vault.getFiles().forEach((file: TFile) => noteFiles.set(file.path, file))
        return noteFiles
    }

    const [noteFiles, setNoteFiles] = useState<Map<String, TFile>>(initNoteFiles());



    useEffect(() => {
        JsNote.getNotesFromVault(vault, metadataCache)
            .then((jsNotes: JsNote[]) => {
                console.log("got notes")
                //console.log(wasmWorkerInstance)
                //console.log(wasmWorkerInstance.add(1,5))
                wasmWorkerInstance.findSilent(jsNotes)
                return [];
            })
            .then((noteLinkMatchResults: Array<NoteMatchingResult>) => {
                setNoteMatchingResults(noteLinkMatchResults)
                initNoteChangeOperations(noteLinkMatchResults);
            })
        return () => {
            // On unmount
        }
    }, [wasmWorkerInstance]);
        if (matchingState == MatchingState.Scanning) return <ProgressComponent progress={linkMatchingProgress}/>
        else if (matchingState == MatchingState.Selecting) return (
            <NoteFilesContext.Provider value={noteFiles}>
                <NoteMatchingResultsList noteMatchingResults={noteMatchingResults}
                                         onNoteChangeOperationSelected={handleNoteChangeOperationSelected}
                                         onClickReplaceButton={handleReplaceButtonClicked}
                />
            </NoteFilesContext.Provider>
        )
        else if (matchingState == MatchingState.Replacing) return <div className={"info-toast"}>⏳ Linking Notes...</div>
        else return <div className={"success-toast"}>🎉 Successfully linked {numberOfLinkedNotes} notes!</div>
};

