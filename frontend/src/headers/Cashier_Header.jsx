import HeaderBase from './HeaderBase';

export default function Cashier_Header() {
    const links = [
        { to: '/cashier/transactions', label: 'Transactions' },
        { to: '/events', label: 'Events' },
        { to: '/events/myEvents', label: 'My Events'},
        { to: '/cashier/redemption', label: 'Redemptions' }
    ];
    return <HeaderBase brand="BananaCreds - Cashier" links={links} />;
}
