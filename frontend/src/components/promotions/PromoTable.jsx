import { Table } from "react-bootstrap";
import { capitalize } from "../../utils/format/string"


function PromoTable({ promos, setClicked }) {
    // ---------- Format the promos ----------
    function formatPromos(promos) {
        let new_promos = [];
        for (const promo of promos) {
            const new_promo = {};
            new_promo.id = promo.id;
            new_promo.name = promo.name;
            new_promo.type = capitalize(promo.type);
            new_promo.endTime = new Date(promo.endTime).toDateString();
            new_promo.startTime = new Date(promo.startTime).toDateString();
            new_promos.push(new_promo);
        }

        return new_promos;
    }
    
    return <Table className="shadow-sm" bordered responsive hover>
        <thead className="table-primary">
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Starts At</th>
                <th>Ends At</th>
            </tr>
        </thead>

        <tbody className="promo-table-body">
            {(promos === null || promos.length === 0) ? (
                <tr>
                    <td colSpan={4} className="text-center">
                            No promotions could be found
                    </td>
                </tr>
            ) : (
                formatPromos(promos).map(item => (
                    <tr key={item.id} onClick={() => setClicked(item.id)}>
                        <td>{item.name}</td>
                        <td>{item.type}</td>
                        <td>{item.startTime}</td>
                        <td>{item.endTime}</td>
                    </tr>
                ))
            )}
        </tbody>
    </Table>;

}

export default PromoTable;