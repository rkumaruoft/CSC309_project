import HeaderBase from './HeaderBase';

export default function Regular_User_Header() {
    const links = [
        { to: '/dashboard', label: 'Home' },
        { to: '/transactions', label: 'Transactions' },
        { to: '/promotions', label: 'Promotions' },
        { to: '/events', label: 'Events' },
        { to: '/redemption', label: 'Redeem' },
        { to: '/transfers', label: 'Transfers' },
    ];
    return <HeaderBase brand="CSSU Rewards" links={links} />;
}
