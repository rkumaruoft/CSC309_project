import HeaderBase from './HeaderBase';

export default function Manager_Header() {
    const links = [
        { to: '/transactions', label: 'Transactions' },
        { to: '/promotions', label: 'Promotions' },
        { to: '/events', label: 'Events' },
        { to: '/manage', label: 'Manage Users' },
    ];
    return <HeaderBase brand="BananaCreds — Manager" links={links} />;
}
