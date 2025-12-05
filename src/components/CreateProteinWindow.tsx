import { ProteinData } from "../types";
import {
    Dialog,
    Flex,
    Text,
    IconButton,
    Grid,
    Button
} from "@radix-ui/themes"
import {
    X,
    Plus,
} from "lucide-react"
import { useState } from "react";
import ProteinDataForm from "./ProteinDataForm";
import {useAlert} from "./Alerts/AlertProvider";

interface ProteinWindowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (newData: ProteinData) => void;
}  

export default function CreateProteinWindow({ open, onOpenChange, onCreate }: ProteinWindowProps) {
    const genericNodeData: ProteinData = {
        label: null,
        initialConcentration: 1,
        lossRate: 1,
        beta: 1,
        // delay: 0,
        inputs: 1,
        outputs: 1,
        inputFunctionType: 'steady-state',
        inputFunctionData: {
            steadyStateValue: 0,
            timeStart: 0,
            timeEnd: 1,
            pulsePeriod: 1,
            amplitude: 1,
            dutyCycle: 0.5,
        }
    };
    const [newProteinData, setNewProteinData] = useState<ProteinData>(genericNodeData);
    const { showAlert } = useAlert();
    const [isFormValid, setIsFormValid] = useState<boolean>(true);
    const [negativeFields, setNegativeFields] = useState<string[]>([]);

    const handleCancel = () => {
        setNewProteinData(genericNodeData)
    }

    const handleCreate = () => {
        if (!newProteinData.label || newProteinData.label.trim() === '') {
            showAlert("Protein label is required");
            return;
        }
        if (!isFormValid) {
            showAlert('Please fix invalid numeric values before creating the protein');
            return;
        }
      
        onCreate(newProteinData);
        setNewProteinData(genericNodeData); // reset for next time
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} >
            <Dialog.Content maxWidth="600px">
                <Flex justify="between">
                    <Dialog.Title mt="1">Create New Protein</Dialog.Title>
                    <Dialog.Close><IconButton variant="ghost" color="gray"><X /></IconButton></Dialog.Close>
                </Flex>
                <Dialog.Description mb="3">Define the properties of your new protein. You can modify these parameters later.</Dialog.Description>

                <Grid columns={{initial: "2"}} gap="4">
                    <ProteinDataForm
                        mode="create"
                        proteinData={newProteinData}
                        setProteinData={setNewProteinData}
                        onValidityChange={setIsFormValid}
                        onNegativeFieldsChange={setNegativeFields}
                    />
                </Grid>

                <Flex justify="end" gap="3" mt="8">
                    <Dialog.Close>
                        <Button variant="surface" color="gray" size="3" onClick={handleCancel}>Cancel</Button>
                    </Dialog.Close>
                    <Dialog.Close>
                        <Button size="3" onClick={handleCreate}><Plus/>Create Protein</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    )
}