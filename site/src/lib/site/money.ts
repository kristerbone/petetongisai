/**
 * Where the money buttons point (ticket 07). Until a link is set its button shows as a "coming soon"
 * placeholder, and neither appears on Dedication pages. Donations go straight to the charity, never
 * through us.
 */

/** The owner's Buy Me a Coffee page, for the hosting costs: a plain link, no widget or cookies. */
export const TIP_URL: string | null = "https://www.buymeacoffee.com/petetongisai";

/** The charity, once it has agreed to be named (ticket 05), and its official fundraising page. */
export const CHARITY: { name: string; url: string } | null = { name: "Shelter", url: "https://www.shelter.org.uk" };
