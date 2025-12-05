import { Col, Container, Row, Table } from "react-bootstrap";
import { capitalize } from "../../utils/format/string"
import LimitSelector from "../LimitSelector";
import AppliedFilters from "./PromoAppliedFilters";
import SortButton from "../SortButton";
import { promoTypeLabel } from "../../utils/format/promotion";


function PromoTable({ promos, setClicked, setLimit, filters, setFilters,
    sorting, setSorting, order, setOrder    
}) {
    // ---------- Format the promos ----------
    function formatPromos(promos) {
        let new_promos = [];
        for (const promo of promos) {
            const new_promo = {};
            new_promo.id = promo.id;
            new_promo.name = promo.name;
            new_promo.type = promoTypeLabel(promo.type);
            new_promo.endTime = new Date(promo.endTime).toDateString();
            new_promo.startTime = new Date(promo.startTime).toDateString();
            new_promos.push(new_promo);
        }

        return new_promos;
    }
    
    return <Container>
        <Row className="justify-content-center align-items-center">
            <Col>
                <LimitSelector setLimit={setLimit} />
            </Col>

            <Col xs="auto" className="d-flex justify-content-center align-items-center">
                {Object.keys(filters).length > 0 &&
                <AppliedFilters filters={filters} setFilters={setFilters} />}
            </Col>

            {/* placeholder */}
            <Col></Col>
        </Row>

        <Row>
            <Table className="shadow-sm" striped responsive hover>
                <thead className="table-primary">
                    <tr>
                        <th>
                            Name
                            <SortButton
                                field={"name"}
                                sorting={sorting}
                                setSorting={setSorting}
                                order={order}
                                setOrder={setOrder}
                            />
                        </th>
                        <th>
                            Type
                            <SortButton
                                field={"type"}
                                sorting={sorting}
                                setSorting={setSorting}
                                order={order}
                                setOrder={setOrder}
                            />
                        </th>
                        <th>
                            Starts At
                            <SortButton
                                field={"startTime"}
                                sorting={sorting}
                                setSorting={setSorting}
                                order={order}
                                setOrder={setOrder}
                            />
                        </th>
                        <th>
                            Ends At
                            <SortButton
                                field={"endTime"}
                                sorting={sorting}
                                setSorting={setSorting}
                                order={order}
                                setOrder={setOrder}
                            />
                        </th>
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
            </Table>
        </Row>
    </Container>;
}

export default PromoTable;