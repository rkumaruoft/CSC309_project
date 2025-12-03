import { useEffect, useState } from "react";
import DateTimePicker from "react-datetime-picker";


function NewDatePicker({ name, addNewField }) {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        if (date) {
            addNewField(name, date)
        }
    }, [date]);

    return <DateTimePicker
        required
        value={date}
        onChange={setDate}
    />

}

export default NewDatePicker;