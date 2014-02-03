class CreateTopics < ActiveRecord::Migration
  def change
    create_table :topics do |t|
      t.text :name
    end
  end
end
