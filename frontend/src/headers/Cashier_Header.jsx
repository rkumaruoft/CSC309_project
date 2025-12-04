import HeaderBase from './HeaderBase';

export default function Cashier_Header() {
    const links = [
        { to: '/cashier/transactions', label: 'Transactions' },
        { to: '/cashier/redemption', label: 'Redemptions' },
    ];
    return <HeaderBase brand="BananaCreds - Cashier" links={links} />;
}
