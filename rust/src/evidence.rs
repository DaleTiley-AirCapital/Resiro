pub struct Evidence {
    pub key: &'static str,
    pub label: &'static str,
    pub category: &'static str,
}
pub const TYPES: &[Evidence] = &[
    Evidence { key: "title-deed", label: "Title / transfer deed", category: "Ownership & Legal" },
    Evidence { key: "approved-plans", label: "Council approved building plans", category: "Plans & Approvals" },
    Evidence { key: "final-plans", label: "Final / amended drawings", category: "Plans & Approvals" },
    Evidence { key: "occupancy", label: "Occupancy certificate", category: "Plans & Approvals" },
    Evidence { key: "electrical", label: "Electrical certificate", category: "Plans & Approvals" },
    Evidence { key: "insurance", label: "Insurance policy", category: "Insurance" },
    Evidence { key: "solar", label: "Solar installation records", category: "Energy & Solar" },
    Evidence { key: "maintenance", label: "Warranties / maintenance invoices", category: "Maintenance" },
];
pub fn find(key: &str) -> Option<&'static Evidence> {
    TYPES.iter().find(|entry| entry.key == key)
}
