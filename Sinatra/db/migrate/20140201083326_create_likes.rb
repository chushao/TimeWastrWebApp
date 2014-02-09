class CreateLikes < ActiveRecord::Migration
  def change
    create_table :likes do |t|
      t.references :users
      t.references :likable, polymorphic: true
      t.text :like_value
    end
  end
end
