import HeaderBase from './HeaderBase';

export default function Manager_Header() {
    const links = [
        { to: '/dashboard', label: 'Home' },
        { to: '/manage', label: 'Manage' },
        { to: '/transactions', label: 'Transactions' },
        { to: '/promotions', label: 'Promotions' },
        { to: '/events', label: 'Events' },
    ];
    return <HeaderBase brand="CSSU Rewards — Manager" links={links} />;
}
