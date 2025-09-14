CREATE TABLE `parking_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`address` text,
	`city` text,
	`state` text,
	`pincode` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`photos` text,
	`total_slots` integer DEFAULT 1 NOT NULL,
	`available_slots` integer DEFAULT 1 NOT NULL,
	`pricing_mode` text DEFAULT 'hourly' NOT NULL,
	`base_price_per_hour_paise` integer DEFAULT 1000 NOT NULL,
	`slab_json` text,
	`approved` integer DEFAULT false NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_id` integer NOT NULL,
	`customer_user_id` text NOT NULL,
	`vehicle_number` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price_paise` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `parking_locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`payment_method` text DEFAULT 'upi' NOT NULL,
	`upi_vpa` text,
	`upi_txn_id` text,
	`qr_payload` text,
	`status` text DEFAULT 'initiated' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_user_id_role_unique` ON `user_roles` (`user_id`,`role`);