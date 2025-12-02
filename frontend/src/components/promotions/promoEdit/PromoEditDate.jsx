import DateTimePicker from "react-datetime-picker";
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import 'react-datetime-picker/dist/DateTimePicker.css';
import { useEffect, useState } from "react";
import { formatTime } from "../../../utils/format/date";

function PromoEditDate ({
        editing,
        field,
        changes,
        setChanges,
        currPromo}) {
    
    const originalDate = new Date(currPromo[field]);
    const [date, setDate] = useState(new Date(currPromo[field]));
    
    // ---------- On change date, set changes ----------
    useEffect(() => {
        if (date && originalDate &&
                date.getTime() !== originalDate.getTime()) {
            setChanges(prev => ({
                ...(prev || {}),
                [field]: date
            }));
        }
    }, [date]);

    function getValue() {
        if (Object.keys(changes).length !== 0 && Object.keys(changes).includes(field)) {
            return changes[field];
        }

        return currPromo[field];
    }
    
    return (editing !== field) ? (
        <span>{formatTime(getValue())}</span>
    ) : (
        <DateTimePicker
            required
            value={date}
            onChange={setDate}
        />
    );

}

export default PromoEditDate;