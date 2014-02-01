# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20140201090131) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "histories", force: true do |t|
    t.integer "sources_id"
    t.integer "topics_id"
    t.integer "users_id"
    t.text    "source_article_id"
    t.integer "favorites"
  end

  create_table "likes", force: true do |t|
    t.integer "users_id"
    t.integer "likable_id"
    t.string  "likable_type"
    t.text    "like_value"
  end

  create_table "sources", force: true do |t|
    t.text "name"
  end

  create_table "topics", force: true do |t|
    t.text "name"
  end

  create_table "users", force: true do |t|
    t.text "email"
    t.text "password"
  end

end
