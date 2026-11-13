import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Selection = {
  templateId: number | null;
  plateId: number | null;
  chooseTemplate: (id: number) => void;
  choosePlate: (id: number) => void;
  applySelection: (templateId: number | null, plateId: number | null) => void;
};

const SelectionContext = createContext<Selection | null>(null);

export function SelectionProvider(props: { readonly children: ReactNode }) {
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [plateId, setPlateId] = useState<number | null>(null);
  const value = useMemo<Selection>(() => ({
    templateId,
    plateId,
    chooseTemplate(id) {
      setTemplateId((current) => {
        if (current !== id) setPlateId(null);
        return id;
      });
    },
    choosePlate(id) {
      setPlateId(id);
    },
    applySelection(nextTemplate, nextPlate) {
      setTemplateId(nextTemplate);
      setPlateId(nextPlate);
    },
  }), [plateId, templateId]);
  return <SelectionContext.Provider value={value}>{props.children}</SelectionContext.Provider>;
}

export function useSelection(): Selection {
  const value = useContext(SelectionContext);
  if (!value) throw new Error('SelectionProvider is missing');
  return value;
}
