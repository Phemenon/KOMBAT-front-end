type Props = {
    onCancel: () => void;
    onSelect: (mode: string) => void;
};

export default function ModeSelect({ onCancel, onSelect }: Props) {
    return (
        <div className="mode-select">
            <div className="modalOverlay">
                <div className="modalBox">
                    <div className="modelHeadCon">
                        <button className="modelCancelBtn" onClick={onCancel}>Cancel</button>

                        <h1 className="modelTitle">
                            Select <br />
                            Mode
                        </h1>
                    </div>

                    <button className="modeBTN" onClick={() => onSelect("DUEL")}>Duel</button>
                    <button className="modeBTN" onClick={() => onSelect("SOLITAIRE")}>Solitaire</button>
                    <button className="modeBTN" onClick={() => onSelect("AUTO")}>Auto</button>
                </div>
            </div>
        </div>
    );
}