import "./ConfigItemStyle.css";
import { useEffect, useState } from "react";

interface ConfigItemProps {
    icon: string;
    label: string;
    value: number;
    onChange?: (value: number) => void;
    editable?: boolean;
    disabled?: boolean;
}

export default function ConfigItem({
                                       icon,
                                       label,
                                       value,
                                       onChange,
                                       editable = false,
                                       disabled = false,
                                   }: ConfigItemProps) {
    const [temp, setTemp] = useState(value.toString());

    useEffect(() => {
        setTemp(value.toString());
    }, [value]);

    return (
        <div className={`configItem ${disabled ? "configItemDisabled" : ""}`}>
            <img src={icon} alt={label} className="configIcon" />
            <span className="configLabel">{label}</span>

            {editable ? (
                <input
                    type="number"
                    value={temp}
                    className="configInput"
                    disabled={disabled}
                    onChange={(e) => {
                        setTemp(e.target.value);
                    }}
                    onBlur={() => {
                        const finalValue = temp === "" ? 0 : Number(temp);
                        setTemp(finalValue.toString());
                        onChange?.(finalValue);
                    }}
                />
            ) : (
                <span className="configValue">{value}</span>
            )}
        </div>
    );
}