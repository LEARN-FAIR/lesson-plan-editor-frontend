import React from 'react';

const NAV_LINKS = [
    {label: 'Lesson plans', href: 'https://plans.fairdata.education/'},
    {label: 'About', href: 'https://plans.fairdata.education/about/'},
    {label: 'Contribute', href: 'https://plans.fairdata.education/contribute/'},
    {label: 'GitHub', href: 'https://github.com/elixir-europe-training/ELIXIR-TrP-FAIR-Converge'},
];

/** Public "FAIR Lesson Plan Handbook" top nav — the frontend chrome (not the editor shell). */
const PublicNav: React.FC = () => (
    <header className="flex h-[52px] flex-shrink-0 items-center justify-between bg-navy px-7 text-white">
        <div className="text-[14.5px] font-semibold">FAIR Lesson Plan Handbook</div>
        <nav className="flex items-center gap-6 text-[13px]">
            {NAV_LINKS.map((l) => (
                <a
                    key={l.label}
                    href={l.href}
                    className="text-white/80 transition-colors hover:text-white"
                >
                    {l.label}
                </a>
            ))}
        </nav>
    </header>
);

export default PublicNav;
