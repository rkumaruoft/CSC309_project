import HeaderBase from './HeaderBase';

export default function Superuser_Header() {
    const links = [
        { to: '/dashboard', label: 'Home' },
        { to: '/events', label: 'Events' },
        { to: '/events/manage', label: 'Manage Events'},
        { to: '/admin', label: 'Admin' },
    ];
    return <HeaderBase brand="BananaCreds — Admin" links={links} />;
}
