import HeaderBase from './HeaderBase';

export default function Manager_Header() {
    const links = [
        { to: '/manage', label: 'Manage Users' },
        { to: '/transactions', label: 'Transactions' },
        { to: '/promotions', label: 'Promotions' },
        { to: '/events', label: 'Events' },
    ];
    return <HeaderBase brand="BananaCreds — Manager" links={links} />;
}
