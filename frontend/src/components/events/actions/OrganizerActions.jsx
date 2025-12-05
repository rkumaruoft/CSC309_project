import { Button } from "react-bootstrap";

export default function OrganizerActions({ // PARAMETERS TO UPDATE ORGANIZER INFO IF NEEDED
    error, 
    setError,

    hasGuests,

    awardMode, 
    setAwardMode,

    showAllButtons,
    setSAB,

    organizer,
    setOrganizer,

    addMode,
    setAddMode,

    addMemb,
    setAddingMemb,

    guestId,
    setGuestId,

    submitted,
    setSubmitted,

    recipientId,
    setRecipientId,

    rewardAmount,
    setRewardAmount,

    addGuest,
    remGuest,

    addOrganizer,

    rewardGuest,

    isHappening,
    hasNotEnded,

    role
}){
    return (
        <>
            {awardMode === null && isHappening && hasGuests && showAllButtons && (
            <div className="d-flex flex-column w-55 mb-3">
            <h5 style={{fontWeight: "bold"}}>Award points</h5>
                <div className="d-flex flex-row gap-1">
                    <Button variant="outline-dark p-1" onClick={() => {setAwardMode('single'); setError(null); setSubmitted(false); setOrganizer(""); setRecipientId(""); setGuestId(""); setSAB(false);}}>Award a guest</Button>
                    <Button variant="outline-dark p-1" onClick={() => {setAwardMode('all'); setError(null); setSubmitted(false); setOrganizer(""); setRecipientId(""); setGuestId(""); setSAB(false);}}>Award all guests</Button>
                </div>
            </div>
            )}
                    
            {awardMode === null && showAllButtons && hasNotEnded && !addMemb && (role === "manager" || role === "superuser") && ( // DISPLAYS TWO BUTTONS FOR PROMPTING
                <>
                    <h5 style={{fontWeight: "bold"}}>Add guests/organizers</h5>
                    <div className="d-flex flex-row gap-2">
                        <Button variant="outline-dark p-1" onClick={() => {setAddMode("g"); setAddingMemb(true); setOrganizer(""); setGuestId(""); setSAB(false);}}>Add guest</Button>
                        <Button variant="outline-dark p-1" onClick={() => {setAddMode("o"); setAddingMemb(true); setOrganizer(""); setGuestId(""); setSAB(false);}}>Add Organizer</Button>
                    </div>
                </>
                )
            }

            {awardMode === null && showAllButtons && hasNotEnded && !addMemb && role != "manager" && role != "superuser" && (
                <>
                    <h5 style={{fontWeight: "bold"}}>Add guests</h5>
                    <div className="d-flex flex-row gap-2">
                        <Button variant="outline-dark p-1" onClick={() => {setAddMode("g"); setOrganizer(""); setGuestId(""); setSAB(false); setAddingMemb(true);}}>Add guest</Button>
                    </div>
                </>
            )}

            {awardMode === null && !showAllButtons && addMemb && hasNotEnded && addMode === "o" && (role === "manager" || role === "superuser") && (
                <div className="d-flex flex-column w-50 mb-2 gap-2">
                    <h5 className="mb-1" style={{fontWeight: "bold"}}>Add organizer</h5>
                    <input
                        name="organizerName"
                        placeholder="organizer UTORid"
                        value={organizer}
                        onChange={(e) => {setOrganizer(e.target.value); setError(null);}}
                    />
                    <div className="d-flex flex-row gap-2 mb-2">
                    <Button variant="success" onClick={() => {addOrganizer(organizer, setOrganizer)}} className="w-50">Add</Button>
                    <Button variant="warning" onClick={() => {setAddMode(null); setAddingMemb(false); setSAB(true); setError(null); setSubmitted(false);}} className="w-50">Cancel</Button>
                    </div>
                </div>  
            )}

            {awardMode === null && !showAllButtons && hasNotEnded && addMemb && addMode === "g" && (
                <div className="d-flex flex-column w-50 mb-2 gap-2">
                    { (role === "manager" || role === "superuser") ? (
                        <h5 className="mb-1" style={{fontWeight: "bold"}}>Add/remove guest</h5>
                        ) : (<h5 className="mb-1" style={{fontWeight: "bold"}}>Add guest</h5>)
                    }
                        <input
                            name="guestId"
                            placeholder="guest UTORid"
                            value={guestId}
                            onChange={(e) => {setGuestId(e.target.value); setError(null);}}
                        />
                        <div className="d-flex flex-row gap-2 mb-2">
                        { (role === "manager" || role === "superuser") ? (
                            <>
                                <Button variant="success" onClick={() => {addGuest(guestId, setGuestId);}} className="w-50">Add</Button>
                                <Button variant="danger" onClick={() => {remGuest(guestId, setGuestId)}} className="w-50">Remove</Button>
                                <Button variant="warning" onClick={() => {setAddMode(null); setAddingMemb(false); setSAB(true); setError(null); setSubmitted(false);}} className="w-50">Cancel</Button>
                            </>
                        ) : (<>
                                <Button variant="success" onClick={() => {addGuest(guestId, setGuestId);}} className="w-50">Add</Button>
                                <Button variant="danger" onClick={() => {setAddMode(null); setAddingMemb(false); setSAB(true); setError(null); setSubmitted(false);}} className="w-50">Cancel</Button>
                            </>)
                        }
                        </div>
                    </div>  
            )}

            {awardMode === 'single' && isHappening && !showAllButtons && (
                <>
                    {(error == null && submitted) && <div className="alert alert-success">Successfully rewarded {recipientId} {rewardAmount} points</div>}
                    <h5 style={{fontWeight: "bold"}}>Award points</h5>
                    <div className="d-flex flex-row mb-2">
                        <div className="w-100">
                            <label><strong style={{fontWeight: "bolder"}}>Recipient</strong></label>
                            <input placeholder="Recipient's UTORid" value={recipientId} onChange={(e) => {setRecipientId(e.target.value); setError(null);}} />
                        </div>
                        <div className="w-100">
                            <label><strong style={{fontWeight: "bolder"}}>Amount</strong></label>
                            <input type="number" placeholder="Amount" value={rewardAmount} onChange={(e) => 
                                {
                                    setRewardAmount(e.target.value);
                                    setSubmitted(false);
                                    setError(null);
                                }} />
                        </div>
                    </div>
                    <div className="d-flex flex-row gap-2 w-50">
                        <Button className="w-50" variant="success" onClick={() => {rewardGuest();}}>Send</Button>
                        <Button className="w-50" variant="danger" onClick={() => {setAwardMode(null); setError(null); setRewardAmount(""); setRecipientId(""); setSAB(true);}}>Cancel</Button>
                    </div>
                </>
            )}

            {awardMode === 'all' && isHappening && !showAllButtons && (
                <>
                    {(error == null && submitted) && <div className="alert alert-success">Successfully rewarded everyone {rewardAmount} points</div>}
                    <div className="d-flex flex-column gap-2 w-50">
                        <h5 style={{fontWeight: "bold"}}>Award points</h5>
                        <input placeholder="Amount per guest" type="number" value={rewardAmount} onChange={(e) => 
                        {
                            setRewardAmount(e.target.value);
                            setSubmitted(false);
                            setError(null);
                        }} />
                        <div className="d-flex flex-row gap-2">
                            <Button variant="success" className="w-50" onClick={() => {rewardGuest();}}>Send</Button>
                            <Button variant="danger" className="w-50" onClick={() => {setAwardMode(null); setError(null); setRewardAmount(""); setSubmitted(false); setSAB(true);}}>Cancel</Button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}