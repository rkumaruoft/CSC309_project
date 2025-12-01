import { Table } from "react-bootstrap";
import { floatToCurrency, formatRate } from "../utils/format/number"
import { capitalize } from "../utils/format/string"


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
            new_promo.minSpending = promo.minSpending === null ? "N/A" : floatToCurrency(promo.minSpending);
            new_promo.rate = promo.rate === null ? "N/A" : formatRate(promo.rate);
            new_promo.points = promo.points === null ? "N/A" : promo.points;
            new_promos.push(new_promo);
        }

        return new_promos;
    }
    
    return <Table bordered responsive hover>
        <thead className="table-primary">
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Ends At</th>
                <th>Minimum Spending</th>
                <th>Rate</th>
                <th>Bonus Points</th>
            </tr>
        </thead>

        <tbody className="promo-table-body">
            {(promos === null || promos.length === 0) ? (
                <tr>
                    <td colSpan={6} className="text-center">
                            No promotions could be found
                    </td>
                </tr>
            ) : (
                formatPromos(promos).map(item => (
                    <tr key={item.id} onClick={() => setClicked(item.id)}>
                        <td>{item.name}</td>
                        <td>{item.type}</td>
                        <td>{item.endTime}</td>
                        <td>{item.minSpending}</td>
                        <td>{item.rate}</td>
                        <td>{item.points}</td>
                    </tr>
                ))
            )}
        </tbody>
    </Table>;

}

export default PromoTable;