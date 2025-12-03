import HeaderBase from './HeaderBase';

export default function Manager_Header() {
    const links = [
        { to: '/transactions', label: 'Transactions' },
        { to: '/managePromotions', label: 'Manage Promotions' },
        { to: '/events', label: 'Events' },
        { to: '/manageEvents', label: 'Manage Events'},
        { to: '/manageUsers', label: 'Manage Users' },
    ];
    return <HeaderBase brand="BananaCreds — Manager" links={links} />;
}
