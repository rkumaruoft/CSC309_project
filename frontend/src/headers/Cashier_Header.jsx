import HeaderBase from './HeaderBase';

export default function Cashier_Header() {
    const links = [
        { to: '/dashboard', label: 'Home' },
        { to: '/cashier/transactions', label: 'Transactions' },
        { to: '/redemption', label: 'Redeem' },
    ];
    return <HeaderBase brand="CSSU Rewards — Cashier" links={links} />;
}
